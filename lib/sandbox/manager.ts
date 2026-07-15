import { mkdir, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { nanoid } from "nanoid";
import {
  startDevServer,
  stopDevServer,
  type DevServerHandle,
} from "./dev-server";
import type { SandboxInstance } from "@/types";

/** 内存中的会话存储 */
const sessions = new Map<string, SandboxInstance>();

/** 项目沙箱根目录 - 使用项目内的 temp 目录 */
const SANDBOX_ROOT = join(process.cwd(), "temp");

/**
 * 写入项目模板文件
 * 只创建最小配置，项目初始为空
 */
async function writeProjectTemplate(projectDir: string): Promise<void> {
  const files: Record<string, string> = {
    "package.json": JSON.stringify({
      name: "vibe-project",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: { dev: "vite", build: "vite build" },
      dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.0",
        vite: "^6.0.0",
        tailwindcss: "^4.0.0",
        "@tailwindcss/vite": "^4.0.0",
      },
    }, null, 2),
    "vite.config.ts": `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nimport tailwindcss from '@tailwindcss/vite'\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n  server: { host: '0.0.0.0', hmr: true }\n})\n`,
  };

  // 写入配置文件
  for (const [path, content] of Object.entries(files)) {
    await writeFile(join(projectDir, path), content, "utf-8");
  }
}

/**
 * 创建新会话：初始化项目 + npm install + 启动 dev server
 */
export async function createSession(): Promise<SandboxInstance> {
  const id = nanoid(10);
  const projectDir = join(SANDBOX_ROOT, `project-${id}`);

  console.log(`[session:${id}] 创建项目目录：${projectDir}`);

  // 确保项目目录存在
  await mkdir(projectDir, { recursive: true });

  // 验证目录确实创建了
  if (!existsSync(projectDir)) {
    throw new Error(`无法创建项目目录：${projectDir}`);
  }

  // 1. 写入模板文件
  console.log(`[session:${id}] 写入模板文件...`);
  await writeProjectTemplate(projectDir);

  // 2. npm install
  console.log(`[session:${id}] npm install (这可能需要几分钟)...`);
  try {
    execSync("npm install", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 180000,
      env: { ...process.env, PATH: process.env.PATH },
    });
  } catch (err: unknown) {
    const error = err as { message: string; stderr?: Buffer; stdout?: Buffer };
    console.error(`[session:${id}] npm install 失败:`, error.message);
    throw new Error(`npm install 失败：${error.message}`);
  }

  // 3. 启动 dev server
  console.log(`[session:${id}] 启动 Vite dev server...`);
  const devServer: DevServerHandle = startDevServer(projectDir);
  await devServer.ready;
  console.log(`[session:${id}] dev server 已就绪，端口：${devServer.port}`);

  const instance: SandboxInstance = {
    id,
    projectDir,
    port: devServer.port,
    process: devServer.process,
    createdAt: Date.now(),
  };

  sessions.set(id, instance);
  return instance;
}

/**
 * 获取会话
 */
export function getSession(id: string): SandboxInstance | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;

  // 验证项目目录是否存在
  if (!existsSync(session.projectDir)) {
    console.warn(`[session:${id}] 项目目录不存在，从内存中移除`);
    sessions.delete(id);
    return undefined;
  }

  return session;
}

/**
 * 获取所有会话
 */
export function getAllSessions(): SandboxInstance[] {
  return [...sessions.values()];
}

/**
 * 销毁会话：kill 进程 + 删除目录
 */
export async function destroySession(id: string): Promise<boolean> {
  const session = sessions.get(id);
  if (!session) return false;

  // 停止 dev server
  if (session.process) {
    stopDevServer({
      process: session.process,
      port: session.port,
      ready: Promise.resolve(),
    });
  }

  // 删除项目目录
  try {
    await rm(session.projectDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`[session:${id}] 清理目录失败:`, err);
  }

  sessions.delete(id);
  console.log(`[session:${id}] destroyed`);
  return true;
}
