import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
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

/** 会话元数据文件 */
const SESSION_META_FILE = "session-meta.json";

/**
 * 写入项目模板文件
 * 只创建最小配置，项目初始为空
 */
async function writeProjectTemplate(projectDir: string): Promise<void> {
  const srcDir = join(projectDir, "src");
  await mkdir(srcDir, { recursive: true });

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
    // 创建最小可运行的 Vite + React 项目
    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    // Tailwind CSS v4 入口
    "src/index.css": `@import "tailwindcss";\n`,
    "src/main.tsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>欢迎来到 Vibe Coding</h1>
      <p style={{ color: '#666' }}>告诉 AI 你想做什么，它来帮你实现</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
`,
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

  // 保存 session 元数据到磁盘
  saveSessionMeta(instance).catch(err => {
    console.error(`[session:${id}] 保存 meta 失败:`, err);
  });

  return instance;
}

/**
 * 保存 session 元数据到磁盘
 */
async function saveSessionMeta(session: SandboxInstance): Promise<void> {
  const metaPath = join(SANDBOX_ROOT, SESSION_META_FILE);
  let metas: Array<{ id: string; projectDir: string; port: number; createdAt: number }> = [];
  try {
    const content = await readFile(metaPath, "utf-8");
    metas = JSON.parse(content);
  } catch {
    // 文件不存在，忽略
  }

  // 移除旧的相同 id 的 entry
  metas = metas.filter(m => m.id !== session.id);
  metas.push({
    id: session.id,
    projectDir: session.projectDir,
    port: session.port,
    createdAt: session.createdAt,
  });

  await writeFile(metaPath, JSON.stringify(metas, null, 2), "utf-8");
}

/**
 * 获取会话（如果内存中没有，尝试从磁盘恢复）
 */
export async function getSession(id: string): Promise<SandboxInstance | undefined> {
  const session = sessions.get(id);
  if (session) {
    // 验证项目目录是否存在
    if (!existsSync(session.projectDir)) {
      console.warn(`[session:${id}] 项目目录不存在，从内存中移除`);
      sessions.delete(id);
      return undefined;
    }
    return session;
  }

  // 内存中没有，尝试从磁盘恢复
  return restoreSessionFromDisk(id);
}

/**
 * 从磁盘恢复 session
 */
async function restoreSessionFromDisk(id: string): Promise<SandboxInstance | undefined> {
  const metaPath = join(SANDBOX_ROOT, SESSION_META_FILE);
  if (!existsSync(metaPath)) {
    return undefined;
  }

  try {
    const content = readFileSync(metaPath, "utf-8");
    const metas: Array<{ id: string; projectDir: string; port: number; createdAt: number }> = JSON.parse(content);
    const meta = metas.find(m => m.id === id);
    if (!meta) {
      return undefined;
    }

    // 验证项目目录是否存在
    if (!existsSync(meta.projectDir)) {
      return undefined;
    }

    // 启动 dev server
    console.log(`[session:${id}] 从磁盘恢复 session`);
    const devServer: DevServerHandle = startDevServer(meta.projectDir);
    await devServer.ready;
    console.log(`[session:${id}] dev server 已就绪，端口：${devServer.port}`);

    const instance: SandboxInstance = {
      id: meta.id,
      projectDir: meta.projectDir,
      port: devServer.port,
      process: devServer.process,
      createdAt: meta.createdAt,
    };

    sessions.set(id, instance);
    return instance;
  } catch (err) {
    console.error(`[session:${id}] 恢复 session 失败:`, err);
    return undefined;
  }
}

/**
 * 获取所有会话
 */
export function getAllSessions(): SandboxInstance[] {
  return [...sessions.values()];
}

/**
 * 销毁会话：kill 进程 + 删除目录 + 清除 meta
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

  // 从 meta 文件中移除
  try {
    const metaPath = join(SANDBOX_ROOT, SESSION_META_FILE);
    if (existsSync(metaPath)) {
      const content = await readFile(metaPath, "utf-8");
      const metas: Array<{ id: string }> = JSON.parse(content);
      const filtered = metas.filter(m => m.id !== id);
      await writeFile(metaPath, JSON.stringify(filtered, null, 2), "utf-8");
    }
  } catch (err) {
    console.error(`[session:${id}] 清理 meta 失败:`, err);
  }

  sessions.delete(id);
  console.log(`[session:${id}] destroyed`);
  return true;
}
