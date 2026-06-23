/**
 * 测试脚本：直接调用 opencode API 查看响应结构
 */

import { createOpencodeClient } from "./client";

async function test() {
  const password = process.env.OPENCODE_SERVER_PASSWORD || "test";
  const client = createOpencodeClient({
    baseUrl: "http://127.0.0.1:55846", // 使用已启动的 server
    password,
  });

  console.log("Testing opencode API...");

  // 获取会话列表
  const sessions = await client.listSessions({ limit: 1 });
  console.log("Sessions:", sessions.data);

  if (sessions.data.length === 0) {
    console.log("No sessions found");
    return;
  }

  const sessionId = sessions.data[0].id;
  console.log("\nFetching session context for:", sessionId);

  // 获取会话上下文（消息历史）
  const context = await client.getContext(sessionId);
  console.log("\nContext messages:", context.data.length);

  // 打印最后一个 assistant 消息的完整结构
  const lastAssistantMsg = context.data
    .filter(m => m.role === "assistant")
    .pop();

  if (lastAssistantMsg) {
    console.log("\n=== Last Assistant Message ===");
    console.log("Type:", lastAssistantMsg.type);
    console.log("Full message:", JSON.stringify(lastAssistantMsg, null, 2));
  }
}

test().catch(console.error);
