import { NextRequest, NextResponse } from "next/server";
import { getGlobalOpencodeServer } from "@/lib/opencode/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const server = getGlobalOpencodeServer();
  if (!server) {
    return NextResponse.json({ error: "Opencode server not running" });
  }

  // 直接转发 opencode 的 /event 端点
  const eventUrl = `${server.url}/event`;
  console.log("[opencode-event] Forwarding to:", eventUrl);

  const response = await fetch(eventUrl, {
    headers: {
      "Authorization": request.headers.get("authorization") || "",
    },
  });

  if (!response.ok) {
    return NextResponse.json({
      error: "Failed to connect to opencode event stream",
      status: response.status
    });
  }

  // 转发 SSE 流
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
