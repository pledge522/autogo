import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/loop-opencode";
import type { SseEvent } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 * body: { sessionId, message }
 *
 * 使用 POST 避免 URL 过长导致 431 错误
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json();
    return handleChat(sessionId, message);
  } catch {
    return new Response(
      JSON.stringify({ error: "无效的请求体" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/chat?sessionId=...&message=...
 * 保留 GET 用于向后兼容，但建议大消息使用 POST
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const message = request.nextUrl.searchParams.get("message");
  return handleChat(sessionId, message);
}

async function handleChat(sessionId: string | null, message: string | null) {
  console.error("═══════════════════════════════════════════");
  console.error("[api/chat] 收到请求 sessionId=%s message=%s",
    sessionId, message?.slice(0, 60));
  console.error("═══════════════════════════════════════════");

  if (!sessionId || !message) {
    return new Response(
      JSON.stringify({ error: "缺少 sessionId 或 message" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const generator = runAgent(sessionId, message);

  /**
   * 使用 ReadableStream + pull 模式从 async generator 拉取事件。
   * 相比 async start() 模式，pull 模式更适合长时间流式传输，
   * Next.js 16 Turbopack 下兼容性更好。
   */
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await generator.next();
        if (result.done) {
          console.error("[api/chat] 流结束");
          controller.close();
          return;
        }

        const event = result.value;
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));

        // 终端日志
        if (event.type === "status") {
          console.error("[api/chat] → %s", event.message);
        } else if (event.type === "error") {
          console.error("[api/chat]  错误：%s", event.message);
        } else {
          console.error("[api/chat] event: %s", event.type);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[api/chat] ✗ 异常：%s", error.message);
        try {
          const data = `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // 客户端已断开
        }
        try { controller.close(); } catch { /* ignore */ }
      }
    },

    cancel() {
      console.error("[api/chat] 客户端断开连接");
      // 让 generator 的 finally 块执行清理
      generator.return?.(undefined as never).catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
