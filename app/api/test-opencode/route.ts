import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sandbox/manager";
import { getGlobalOpencodeServer } from "@/lib/opencode/server";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" });
  }

  const server = getGlobalOpencodeServer();
  if (!server) {
    return NextResponse.json({ error: "Opencode server not running" });
  }

  const opencodeSessionId = `ses-autogo-${sessionId}`;

  try {
    // 获取会话上下文
    const context = await server.client.getContext(opencodeSessionId);

    // 返回最后一个 assistant 消息的完整结构
    const lastAssistantMsg = context.data
      .filter((m: any) => m.role === "assistant")
      .pop();

    return NextResponse.json({
      sessionId,
      opencodeSessionId,
      messagesCount: context.data.length,
      lastAssistantMessage: lastAssistantMsg || null,
    });
  } catch (error: any) {
    console.error("[test-opencode] Error:", error);
    return NextResponse.json({
      error: error.message,
      sessionId,
      opencodeSessionId,
    });
  }
}
