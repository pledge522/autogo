/**
 * 基于 opencode 的 Agent 循环
 *
 * 使用 opencode headless server 的 instance httpapi：
 *   POST /session/:id/message  → 同步返回完整 AI 回复
 *   请求体格式: { parts: [{ type: "text", text: "..." }] }
 *   响应: { info: { finish, tokens, ... }, parts: [...] }
 *
 * parts 数组中每个元素的 type 可能是：
 *   step-start, reasoning, text, tool-call, step-finish 等
 * 这里按 type 映射到 autogo 的 SSE 事件，逐个 yield 给前端，
 * 模拟流式效果。
 */

import { existsSync } from "fs";
import { getSession } from "@/lib/sandbox/manager";
import type { SseEvent } from "@/types";
import {
  startOpencodeServer,
  getGlobalOpencodeServer,
} from "@/lib/opencode/server";
import {
  OpencodeApiError,
  type OpencodeClient,
  type SessionMessageResponse,
  type MessagePart,
} from "@/lib/opencode/client";

/** autogo 会话 ID → opencode 会话 ID 的映射 */
const opencodeSessionMap = new Map<string, string>();

/** opencode 会话 ID 前缀 */
const OPENCODE_SESSION_PREFIX = "ses-autogo-";

/**
 * 核心 Agent 循环
 */
export async function* runAgent(
  sessionId: string,
  userMessage: string,
): AsyncGenerator<SseEvent> {
  const session = getSession(sessionId);
  if (!session) {
    yield { type: "error", message: `会话不存在：${sessionId}` };
    return;
  }

  if (!session.projectDir || !existsSync(session.projectDir)) {
    yield { type: "error", message: `项目目录不存在，请刷新页面重新创建会话` };
    return;
  }

  // 1. 启动/复用 opencode server
  let server = getGlobalOpencodeServer();
  if (!server) {
    yield { type: "status", message: "正在启动编码引擎..." };
    try {
      server = await startOpencodeServer({ timeout: 15000 });
      console.log("[runAgent] opencode server:", server.url);
    } catch (err) {
      console.error("[runAgent] 启动 opencode 失败:", err);
      yield { type: "error", message: `启动编码引擎失败：${err instanceof Error ? err.message : err}` };
      return;
    }
  }

  const client = server.client;

  // 2. 创建或复用 opencode 会话
  let opencodeSessionId = opencodeSessionMap.get(sessionId);
  if (!opencodeSessionId) {
    try {
      opencodeSessionId = await getOrCreateOpencodeSession(
        client,
        sessionId,
        session.projectDir,
      );
      opencodeSessionMap.set(sessionId, opencodeSessionId);
    } catch (err) {
      console.error("[runAgent] 创建会话失败:", err);
      yield { type: "error", message: `创建会话失败：${err instanceof Error ? err.message : err}` };
      return;
    }
  }

  // 3. 发送消息（同步等待 AI 完整回复，免费模型可能较慢）
  yield { type: "status", message: "正在生成…" };
  console.error("[runAgent] 发送消息 session=%s prompt=%s", opencodeSessionId, userMessage.slice(0, 40));
  const sendStart = Date.now();

  let result: SessionMessageResponse;
  try {
    // 最多等 5 分钟（复杂请求可能触发多次工具调用）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300_000);
    result = await client.sendMessage(
      opencodeSessionId,
      { text: userMessage },
      controller.signal,
      { providerID: "deepseek", modelID: "deepseek-v4-flash" },
    );
    clearTimeout(timeoutId);
  } catch (err) {
    console.error("[runAgent] 发送消息失败 (耗时 %ds): %s",
      Math.round((Date.now() - sendStart) / 1000),
      err instanceof Error ? err.message : err);
    yield { type: "error", message: `生成失败：${err instanceof Error ? err.message : err}` };
    return;
  }

  console.log("[runAgent] AI 回复完成 finish=%s tokens=%o parts=%d",
    result.info.finish, result.info.tokens, result.parts.length);

  // 空响应检测
  if (!result.parts.length || result.info.tokens?.output === 0) {
    console.error("[runAgent] ⚠️ AI 返回了空响应！完整结果:", JSON.stringify(result).slice(0, 500));
    yield {
      type: "error",
      message: "AI 返回了空响应。请检查 opencode 配置是否正确（模型/端点/key）。\n" +
        "终端运行验证：cd opencode && echo 你好 | bun run packages/opencode/src/index.ts run",
    };
    return;
  }

  // 4. 遍历 parts，逐个 yield 事件
  for (const part of result.parts) {
    for (const event of mapPartToEvents(part, result.info)) {
      yield event;
    }
  }

  yield { type: "complete" };
}

/**
 * 获取已有或创建新的 opencode 会话
 */
async function getOrCreateOpencodeSession(
  client: OpencodeClient,
  autogoSessionId: string,
  projectDir: string,
): Promise<string> {
  const id = `${OPENCODE_SESSION_PREFIX}${autogoSessionId}`;
  try {
    const result = await client.createSession({
      id,
      location: { directory: projectDir },
      model: { providerID: "deepseek", id: "deepseek-v4-flash" },
    });
    console.log("[runAgent] 会话已创建:", result.data.id);
    return result.data.id;
  } catch (err) {
    if (err instanceof OpencodeApiError && err.status === 409) {
      const existing = await client.getSession(id);
      console.log("[runAgent] 复用已有会话:", existing.data.id);
      return existing.data.id;
    }
    throw err;
  }
}

/**
 * 将单个 MessagePart 映射为 SseEvent 序列
 */
function* mapPartToEvents(
  part: MessagePart,
  info: SessionMessageResponse["info"],
): Generator<SseEvent> {
  switch (part.type) {
    case "step-start":
      yield { type: "status", message: "正在思考..." };
      break;

    case "reasoning":
      // 思考过程 — 发送 thinking 事件让前端展示
      if (part.text) {
        yield { type: "thinking", text: part.text };
      }
      break;

    case "text": {
      // AI 生成的文本 —— 作为 text_delta 推送
      const text = part.text || "";
      if (text) {
        // 按自然段或字符分批推，模拟流式
        const chunks = splitText(text);
        for (const chunk of chunks) {
          yield { type: "text_delta", text: chunk };
        }
      }
      break;
    }

    case "tool-invocation": {
      // opencode 工具调用 — 根据 state 区分 call/result
      const toolInv = part.toolInvocation;
      if (!toolInv) break;

      if (toolInv.state === "call" || toolInv.state === "partial-call") {
        // 工具调用开始
        yield {
          type: "tool_call",
          name: toolInv.toolName || "unknown",
          input: toolInv.args || {},
        };
      } else if (toolInv.state === "result") {
        // 工具调用结果
        yield {
          type: "tool_result",
          name: toolInv.toolName || "unknown",
          output: toolInv.result || "✓ 完成",
        };
      }
      break;
    }

    case "tool-use":
    case "tool-call":
      yield {
        type: "tool_call",
        name: part.tool || "unknown",
        input: part.input || {},
      };
      break;

    case "tool-result":
      yield {
        type: "tool_result",
        name: part.tool || "unknown",
        output: summarizeContent(part.content),
      };
      break;

    case "step-finish":
      // 每步完成
      break;

    case "error":
      yield {
        type: "error",
        message: part.text || "未知错误",
      };
      break;

    default:
      // 其余 part 类型静默跳过
      break;
  }
}

/** 将文本拆成小段以模拟流式效果 */
function splitText(text: string): string[] {
  if (text.length <= 50) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const size = Math.min(remaining.length, 20 + Math.floor(Math.random() * 30));
    chunks.push(remaining.slice(0, size));
    remaining = remaining.slice(size);
  }
  return chunks;
}

function summarizeContent(content: unknown): string {
  if (!Array.isArray(content)) return "✓ 完成";
  const texts: string[] = [];
  for (const item of content) {
    if (item && typeof item === "object" && "text" in item) {
      const t = String((item as { text: unknown }).text);
      texts.push(t.length > 200 ? t.slice(0, 200) + "…" : t);
    }
  }
  return texts.length > 0 ? texts.join("\n") : "✓ 完成";
}

/** 清理 —— 保持 server 在后台运行 */
export async function cleanupOpencode(): Promise<void> {
  console.log("[runAgent] 清理（保持 server 运行中）");
}
