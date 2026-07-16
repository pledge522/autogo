import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { getSession } from "@/lib/sandbox/manager";

const CHAT_HISTORY_FILE = "chat-history.json";

/**
 * POST /api/chat-history?id=xxx - 保存聊天记录
 * body: { messages: ChatMessage[] }
 */
export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  try {
    const { messages } = await request.json();
    const chatHistoryPath = join(session.projectDir, CHAT_HISTORY_FILE);
    await writeFile(chatHistoryPath, JSON.stringify(messages, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("保存聊天记录失败:", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}

/**
 * GET /api/chat-history?id=xxx - 获取聊天记录
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) {
    // 尝试从磁盘恢复
    const sessionMetaPath = join(process.cwd(), "temp", "session-meta.json");
    if (existsSync(sessionMetaPath)) {
      try {
        const content = await readFile(sessionMetaPath, "utf-8");
        const metas: Array<{ id: string; projectDir: string }> = JSON.parse(content);
        const meta = metas.find(m => m.id === id);
        if (meta && existsSync(meta.projectDir)) {
          const chatHistoryPath = join(meta.projectDir, CHAT_HISTORY_FILE);
          if (existsSync(chatHistoryPath)) {
            const chatContent = await readFile(chatHistoryPath, "utf-8");
            return NextResponse.json(JSON.parse(chatContent));
          }
        }
      } catch {
        // 忽略错误
      }
    }
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  const chatHistoryPath = join(session.projectDir, CHAT_HISTORY_FILE);
  if (!existsSync(chatHistoryPath)) {
    return NextResponse.json([]);
  }

  try {
    const content = await readFile(chatHistoryPath, "utf-8");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json([]);
  }
}
