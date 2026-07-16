import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const SANDBOX_ROOT = join(process.cwd(), "temp");
const SESSION_META_FILE = "session-meta.json";
const CHAT_HISTORY_FILE = "chat-history.json";

/**
 * 获取所有历史项目
 */
export async function GET() {
  const metaPath = join(SANDBOX_ROOT, SESSION_META_FILE);

  if (!existsSync(metaPath)) {
    return NextResponse.json([]);
  }

  try {
    const content = await readFile(metaPath, "utf-8");
    const metas: Array<{
      id: string;
      projectDir: string;
      port: number;
      createdAt: number;
    }> = JSON.parse(content);

    // 按创建时间倒序排列
    metas.sort((a, b) => b.createdAt - a.createdAt);

    // 为每个项目加载最后一条消息
    const projects = await Promise.all(
      metas.map(async (meta) => {
        const chatHistoryPath = join(meta.projectDir, CHAT_HISTORY_FILE);
        let lastMessage: string | undefined;

        if (existsSync(chatHistoryPath)) {
          try {
            const chatContent = await readFile(chatHistoryPath, "utf-8");
            const chatHistory = JSON.parse(chatContent);
            const lastUserMsg = [...chatHistory].reverse().find((m: any) => m.role === "user");
            if (lastUserMsg) {
              lastMessage = lastUserMsg.content;
            }
          } catch {
            // 忽略错误
          }
        }

        // 生成项目名称（基于项目目录或最后消息）
        const name = lastMessage
          ? lastMessage.slice(0, 20) + (lastMessage.length > 20 ? "..." : "")
          : `项目 ${meta.id.slice(0, 6)}`;

        return {
          ...meta,
          name,
          lastMessage,
        };
      })
    );

    return NextResponse.json(projects);
  } catch (err) {
    console.error("加载项目列表失败:", err);
    return NextResponse.json({ error: "加载项目失败" }, { status: 500 });
  }
}
