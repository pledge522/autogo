/**
 * opencode server 管理
 *
 * 负责启动、停止 opencode server 进程
 * 并提供 SDK client 用于 API 调用
 *
 * 使用 opencode 源码直接启动，无需全局安装
 */

import { spawn, type ChildProcess } from "child_process";
import { createOpencodeClient, type OpencodeClient } from "./client";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { homedir } from "os";
import path from "path";

export interface OpencodeServerConfig {
  /** opencode 源码目录，默认使用 ./opencode */
  opencodeDir?: string;
  /** server 端口，默认 0（OS 分配空闲端口，彻底消除端口冲突） */
  port?: number;
  /** server 主机，默认 127.0.0.1 */
  hostname?: string;
  /** 项目目录（仅用于日志，不绑定到 client） */
  projectDir?: string;
  /** 启动超时时间 (ms)，默认 15000 */
  timeout?: number;
  /** 认证密码（可选，默认从密码文件读取或自动生成） */
  password?: string;
}

export interface OpencodeServer {
  /** server URL */
  url: string;
  /** 关闭 server */
  close(): Promise<void>;
  /** 获取 SDK client */
  client: OpencodeClient;
  /** 底层进程 */
  process: ChildProcess;
}

const PASSWORD_DIR = path.join(homedir(), ".local", "state", "opencode");
const PASSWORD_FILE = path.join(PASSWORD_DIR, "password");

/**
 * 获取或生成 opencode server 密码
 * 优先使用传入的 password，其次从密码文件读取，最后自动生成
 */
function resolvePassword(password?: string): string {
  if (password) return password;

  // 尝试从文件读取已有密码
  if (existsSync(PASSWORD_FILE)) {
    const existing = readFileSync(PASSWORD_FILE, "utf-8").trim();
    if (existing) return existing;
  }

  // 生成新密码并写入文件
  const generated = randomBytes(32).toString("base64url");
  mkdirSync(PASSWORD_DIR, { recursive: true });
  writeFileSync(PASSWORD_FILE, generated, { mode: 0o600 });
  return generated;
}

let globalServer: OpencodeServer | null = null;
let cleanupRegistered = false;

/**
 * 注册进程退出时自动清理 opencode 子进程
 */
function registerCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  const shutdown = (signal: string) => {
    if (globalServer) {
      console.log("[opencode] Received %s, stopping server...", signal);
      stopOpencodeProcess(globalServer.process);
      globalServer = null;
    }
  };

  process.once("beforeExit", () => shutdown("beforeExit"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

/**
 * 启动 opencode server
 *
 * @param config 配置
 * @returns server 实例
 */
export async function startOpencodeServer(
  config: OpencodeServerConfig
): Promise<OpencodeServer> {
  const {
    opencodeDir = process.env.OPENCODE_DIR || join(process.cwd(), "opencode"),
    port = 0,
    hostname = "127.0.0.1",
    projectDir,
    timeout = 15000,
    password,
  } = config;

  // 解析认证密码
  const authPassword = resolvePassword(password);

  // 检查是否已有 server 在运行（含存活检查）
  if (globalServer) {
    const proc = globalServer.process;
    if (proc.exitCode === null && !proc.killed && proc.pid) {
      console.log("[opencode] Reusing existing server:", globalServer.url);
      return globalServer;
    }
    console.log("[opencode] Existing server dead (exitCode=%s, killed=%s), restarting", proc.exitCode, proc.killed);
    globalServer = null;
  }

  // 完整版 OpenCode server（包含 session 执行引擎）
  // packages/opencode 主包有完整的 LLM 客户端、工具注册、agent 循环
  const mainEntry = join(opencodeDir, "packages/opencode/src/index.ts");

  const args = [
    "run",
    "--cwd",
    opencodeDir,
    "--conditions=browser",
    mainEntry,
    "serve",
    `--hostname=${hostname}`,
    `--port=${port}`,
  ];

  console.log("[opencode] Starting server from source:");
  console.log("  command: bun", args.join(" "));
  console.log("  projectDir:", projectDir);

  return new Promise((resolve, reject) => {
    const proc = spawn("bun", args, {
      cwd: opencodeDir,
      env: {
        ...process.env,
        // 完整版 OpenCode server 需要的环境变量
        OPENCODE_SERVER_PASSWORD: authPassword,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let resolved = false;
    let serverUrl = "";

    const cleanup = () => {
      proc.stdout?.removeAllListeners();
      proc.stderr?.removeAllListeners();
      proc.removeAllListeners();
    };

    const timeoutId = setTimeout(() => {
      if (resolved) return;
      cleanup();
      stopOpencodeProcess(proc);
      reject(new Error(`Timeout waiting for opencode server to start after ${timeout}ms`));
    }, timeout);

    proc.stdout?.on("data", (chunk) => {
      if (resolved) return;
      output += chunk.toString();

      const lines = output.split("\n");
      for (const line of lines) {
        // opencode server listening on http://127.0.0.1:xxxxx（端口由 OS 分配）
        if (line.includes("server listening on") || line.includes("opencode server listening on")) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/);

          if (!match) {
            cleanup();
            stopOpencodeProcess(proc);
            clearTimeout(timeoutId);
            reject(new Error(`Failed to parse server url from output: ${line}`));
            return;
          }
          serverUrl = match[1];
          clearTimeout(timeoutId);
          resolved = true;

          console.log("[opencode] Server started:", serverUrl);

          // 创建 client（不绑定单个 projectDir — 多会话复用同一 server，
          // 各 session 通过 location.directory 隔离）
          const client = createOpencodeClient({
            baseUrl: serverUrl,
            password: authPassword,
          });

          const server: OpencodeServer = {
            url: serverUrl,
            client,
            process: proc,
            close: async () => {
              console.log("[opencode] Closing server...");
              stopOpencodeProcess(proc);
              globalServer = null;
            },
          };

          globalServer = server;
          registerCleanup();
          resolve(server);
          return;
        }
      }
    });

    proc.stderr?.on("data", (chunk) => {
      output += chunk.toString();
      console.error("[opencode stderr]", chunk.toString().trim());
    });

    proc.on("exit", (code) => {
      clearTimeout(timeoutId);
      if (!resolved) {
        let msg = `Server exited with code ${code}`;
        if (output.trim()) {
          msg += `\nServer output: ${output}`;
        }
        reject(new Error(msg));
      } else {
        console.log("[opencode] Server process exited with code", code);
      }
    });

    proc.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * 停止 opencode server 进程
 */
function stopOpencodeProcess(proc: ChildProcess): void {
  const pid = proc.pid;
  if (!pid) return;

  console.log("[opencode] Stopping server process (PID:", pid + ")");
  // 尝试优雅关闭
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    console.log("[opencode] SIGTERM failed, using SIGKILL");
  }

  // 如果 3 秒后还没关闭，强制终止
  setTimeout(() => {
    if (proc.exitCode === null && proc.killed === false) {
      try {
        process.kill(pid, "SIGKILL");
        console.log("[opencode] Server force killed");
      } catch {
        // 进程可能已经退出
      }
    }
    }, 3000);
}

/**
 * 获取全局 server 实例，如果 server 已死亡则返回 null
 */
export function getGlobalOpencodeServer(): OpencodeServer | null {
  if (!globalServer) return null;

  // 检查进程是否存活
  const proc = globalServer.process;
  if (proc.exitCode !== null || proc.killed || !proc.pid) {
    console.log("[opencode] Existing server process is dead, clearing reference");
    globalServer = null;
    return null;
  }

  return globalServer;
}

/**
 * 关闭全局 server
 */
export async function closeGlobalOpencodeServer(): Promise<void> {
  if (globalServer) {
    await globalServer.close();
  }
}
