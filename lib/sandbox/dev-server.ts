import { spawn, type ChildProcess, execSync } from "child_process";
import { resolve } from "path";

export interface DevServerHandle {
  process: ChildProcess;
  port: number;
  ready: Promise<void>;
}

/**
 * 查找并杀掉占用指定端口的进程
 */
function killPort(port: number): void {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
      stdio: "ignore",
    });
  } catch {
    // 忽略错误
  }
}

/**
 * 启动 Vite dev server
 * @returns 进程句柄和端口
 */
export function startDevServer(projectDir: string): DevServerHandle {
  const viteBin = resolve(projectDir, "node_modules/.bin/vite");

  // 先找一个空闲端口
  let port = 5200;
  while (true) {
    try {
      // 检查端口是否被占用
      const result = execSync(`lsof -ti:${port} 2>/dev/null || echo ""`, {
        encoding: "utf-8",
      }).trim();
      if (!result) break; // 端口空闲
      port++;
    } catch {
      break;
    }
  }

  // 确保端口是空的
  killPort(port);

  const child = spawn(viteBin, ["--port", String(port), "--host", "0.0.0.0"], {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "development" },
  });

  const ready = new Promise<void>((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => {
      rejectReady(new Error(`Dev server 启动超时 (port ${port})`));
    }, 60000);

    let started = false;

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (!started && (text.includes("Local:") || text.includes("ready in"))) {
        started = true;
        clearTimeout(timeout);
        resolveReady();
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      console.error(`[vite:${port}]`, data.toString());
    });

    child.on("error", (err) => {
      if (!started) {
        clearTimeout(timeout);
        rejectReady(err);
      }
    });

    child.on("exit", (code) => {
      if (!started) {
        clearTimeout(timeout);
        rejectReady(new Error(`Dev server 异常退出，code=${code}`));
      }
    });
  });

  return { process: child, port, ready };
}

/**
 * 停止 dev server 进程并释放端口
 */
export function stopDevServer(handle: DevServerHandle): void {
  if (handle.process && !handle.process.killed) {
    handle.process.kill("SIGTERM");
    // 3 秒后强制 kill
    setTimeout(() => {
      if (handle.process && !handle.process.killed) {
        handle.process.kill("SIGKILL");
        killPort(handle.port);
      }
    }, 3000);
  } else {
    killPort(handle.port);
  }
}
