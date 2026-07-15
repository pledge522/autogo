import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import { join, resolve } from "path";
import { getSession } from "@/lib/sandbox/manager";

export const dynamic = "force-dynamic";

/** GET /api/files?id=xxx&path=src/App.tsx — 获取文件列表或文件内容 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const filePath = request.nextUrl.searchParams.get("path");

  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  // 读取单个文件
  if (filePath) {
    const fullPath = resolve(session.projectDir, filePath);
    if (!fullPath.startsWith(session.projectDir)) {
      return NextResponse.json({ error: "路径越界" }, { status: 403 });
    }
    try {
      const content = await readFile(fullPath, "utf-8");
      return NextResponse.json({ path: filePath, content });
    } catch {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }
  }

  // 列出文件树
  try {
    const files = await listFiles(session.projectDir, session.projectDir);
    return NextResponse.json({ files });
  } catch (err: unknown) {
    const error = err as { message: string };
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function listFiles(dir: string, baseDir: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const result: string[] = [];

  const sorted = entries
    .filter((e) => {
      // 过滤：隐藏文件、node_modules、dist、build 等构建产物
      if (e.name.startsWith(".")) return false;
      if (e.name === "node_modules" || e.name === "dist" || e.name === "build") return false;
      // 过滤配置文件，不展示给用户
      if (e.name === "package.json" || e.name === "vite.config.ts") return false;
      return true;
    })
    .sort((a, b) => {
      // 目录在前
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    const fullPath = join(dir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      result.push(`${relativePath}/`);
      const subFiles = await listFiles(fullPath, baseDir, relativePath);
      result.push(...subFiles);
    } else {
      // 过滤大文件（> 50KB）
      const stats = await stat(fullPath);
      if (stats.size < 50 * 1024) {
        result.push(relativePath);
      }
    }
  }

  return result;
}
