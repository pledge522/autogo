import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { startDevServer } from "@/lib/sandbox/dev-server";

const SANDBOX_ROOT = join(process.cwd(), "temp");
const SESSION_META_FILE = "session-meta.json";

/**
 * GET /api/session/latest - 获取最近的会话
 */
export async function GET() {
  const metaPath = join(SANDBOX_ROOT, SESSION_META_FILE);
  if (!existsSync(metaPath)) {
    return NextResponse.json({ session: null });
  }

  try {
    const content = readFileSync(metaPath, "utf-8");
    const metas: Array<{ id: string; projectDir: string; port: number; createdAt: number }> = JSON.parse(content);
    // 按创建时间排序，最新的在前
    const sortedMetas = metas.sort((a, b) => b.createdAt - a.createdAt);

    for (const meta of sortedMetas) {
      // 验证项目目录是否存在
      if (!existsSync(meta.projectDir)) {
        continue;
      }

      // 尝试启动 dev server
      try {
        const devServer = startDevServer(meta.projectDir);
        await devServer.ready;

        return NextResponse.json({
          session: {
            id: meta.id,
            projectDir: meta.projectDir,
            port: devServer.port,
            createdAt: meta.createdAt,
          },
        });
      } catch (err) {
        console.error(`[api/session/latest] 启动 session ${meta.id} 失败:`, err);
        continue;
      }
    }
  } catch (err) {
    console.error("[api/session/latest] 恢复失败:", err);
  }

  return NextResponse.json({ session: null });
}
