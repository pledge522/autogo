/**
 * 基于 opencode 的 Agent 循环
 *
 * 使用 promptAsync（异步触发）+ getMessages 轮询：
 * - promptAsync 立即返回，agent loop 在后台执行
 * - 轮询 /session/:id/messages 获取实时事件
 * - 前端实时看到思考过程、工具调用、文件变更等
 */

import { existsSync } from "fs";
import { getSession } from "@/lib/sandbox/manager";
import type { SseEvent } from "@/types";
import {
  startOpencodeServer,
  getGlobalOpencodeServer,
} from "@/lib/opencode/server";
import { type MessagePart } from "@/lib/opencode/client";
import { getDefaultModel, getOpencodeModelConfig, type ModelConfig } from "@/lib/model-config";

/** autogo 会话 ID → opencode 会话 ID 的映射 */
const opencodeSessionMap = new Map<string, string>();

/** opencode 会话 ID 前缀 */
const OPENCODE_SESSION_PREFIX = "ses-autogo-";

/**
 * 获取当前使用的模型配置
 */
function getModelConfig(): ModelConfig {
  const model = getDefaultModel();
  if (!model) {
    throw new Error("未在 secret.txt 中找到模型配置");
  }
  return model;
}

/**
 * 从模型配置获取 opencode 的 provider 和 model
 */
function getOpencodeModelInput(modelConfig: ModelConfig) {
  return getOpencodeModelConfig(modelConfig);
}

/**
 * 核心 Agent 循环
 */
export async function* runAgent(
  sessionId: string,
  userMessage: string,
): AsyncGenerator<SseEvent> {
  const session = await getSession(sessionId);
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
      yield { type: "error", message: `创建会话失败：${err instanceof Error ? err.message : err}` };
      return;
    }
  }

  // 3. 异步触发 agent loop
  yield { type: "status", message: "正在生成…" };

  // 记录当前已存在的消息，用于后续去重（只推送本轮新增的）
  const existingMessages = await client.getMessages(opencodeSessionId);
  const existingPartIds = new Set<string>();
  for (const msg of existingMessages) {
    if (msg.info?.role !== "assistant") continue;
    for (const part of msg.parts) {
      const partId = (part as any).id || "";
      if (partId) {
        const msgId = (msg as any).info?.id || "unknown";
        existingPartIds.add(`${msgId}-${partId}`);
      }
    }
  }

  try {
    const modelConfig = getModelConfig();
    const { providerID, modelID } = getOpencodeModelInput(modelConfig);

    await client.promptAsync(
      opencodeSessionId,
      { text: userMessage },
      { providerID, modelID },
    );
  } catch (err) {
    yield { type: "error", message: `启动失败：${err instanceof Error ? err.message : err}` };
    return;
  }

  // 4. 轮询消息直到 agent loop 完成（只推送本轮新增的 part）
  const seenParts = new Set<string>();
  let noNewCount = 0;
  let pollCount = 0;
  let startTime = Date.now();

  while (noNewCount < 30) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    pollCount++;

    const messages = await client.getMessages(opencodeSessionId);
    let hasNew = false;

    // 每 5 次轮询打印一次状态
    if (pollCount % 5 === 0) {
      console.log("[runAgent] 轮询 #%d: messages=%d, seenParts=%d, elapsed=%ds",
        pollCount, messages.length, seenParts.size, Math.round((Date.now() - startTime) / 1000));
    }

    for (const msg of messages) {
      if (msg.info?.role !== "assistant") continue;

      for (const part of msg.parts) {
        const partId = (part as any).id || "";
        const partText = part.text || "";
        const partState = (part as any).state;

        // 空 text part 不作去重（它还没有内容，后续会被填充）
        if (part.type === "text" && !partText) continue;

        // 去重：优先使用 partId 作为唯一标识
        const msgId = (msg as any).info?.id || "unknown";
        const key = partId ? `${msgId}-${partId}` : `${part.type}-${partText.slice(0, 100)}`;

        // 跳过本轮开始前已存在的 part（历史消息）
        if (partId && existingPartIds.has(key)) {
          continue;
        }

        // 对于 tool 类型，需要检查 state 是否变化（pending → running → completed）
        // 使用 state.status 作为去重 key 的一部分
        const fullKey = part.type === "tool" && partState?.status
          ? `${key}-${partState.status}`
          : key;

        // 跳过本轮已推送过的 part（相同状态）
        if (seenParts.has(fullKey)) {
          continue;
        }
        seenParts.add(fullKey);
        hasNew = true;
        noNewCount = 0;

        if (part.type === "text") {
          yield { type: "thinking", text: partText };
          continue;
        }
        for (const event of mapPartToEvents(part)) yield event;
      }
    }

    // 检查最后一条 assistant 消息是否已完成
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.info?.finish && lastMsg.info.role === "assistant" && !hasNew) {
      break;
    }
  }

  yield { type: "complete" };
}

/**
 * 获取已有或创建新的 opencode 会话
 */
async function getOrCreateOpencodeSession(
  client: import("@/lib/opencode/client").OpencodeClient,
  autogoSessionId: string,
  projectDir: string,
): Promise<string> {
  const freshId = `${OPENCODE_SESSION_PREFIX}${autogoSessionId}-${Date.now()}`;

  const modelConfig = getModelConfig();
  const { providerID, modelID } = getOpencodeModelInput(modelConfig);

  const result = await client.createSession({
    id: freshId,
    location: { directory: projectDir },
    model: {
      providerID,
      id: modelID,
    },
  });
  return result.data.id;
}

/**
 * 将单个 MessagePart 映射为 SseEvent 序列
 */
function* mapPartToEvents(part: MessagePart): Generator<SseEvent> {
  switch (part.type) {
    case "step-start":
      yield { type: "status", message: "正在思考..." };
      break;

    case "reasoning": {
      const text = part.text || "";
      if (text) {
        yield { type: "thinking", text };
      }
      break;
    }

    case "text": {
      const text = part.text || "";
      if (text) {
        const chunks = splitText(text);
        for (const chunk of chunks) {
          yield { type: "text_delta", text: chunk };
        }
      }
      break;
    }

    case "tool": {
      const state = part.state;
      const toolName = part.tool || "unknown";
      if (!state) break;

      switch (state.status) {
        case "pending":
          break;

        case "running": {
          const toolInput = (state.input || {}) as Record<string, unknown>;

          // 特殊处理 question 工具：发送 question 事件而不是 tool_call
          if (toolName === "question" && toolInput.questions) {
            yield {
              type: "question",
              questions: toolInput.questions as {
                question: string;
                header: string;
                options: { label: string; description?: string; preview?: string }[];
                multiple?: boolean;
              }[]
            };
          } else {
            yield { type: "tool_call", name: toolName, input: toolInput };
          }
          break;
        }

        case "completed": {
          const output = state.output || state.title || "✓ 完成";
          // question 工具不需要显示 result
          if (toolName !== "question") {
            yield {
              type: "tool_result",
              name: toolName,
              output: output.length > 500 ? output.slice(0, 500) + "…" : output,
            };
          }
          break;
        }

        case "error": {
          yield {
            type: "tool_result",
            name: toolName,
            output: `Error: ${state.error || "工具执行失败"}`,
          };
          break;
        }
      }
      break;
    }

    case "file": {
      const path = (part as any).filename || (part as any).url || "unknown";
      yield {
        type: "file_change",
        path,
        action: "create" as const,
      };
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
      if (part.outputPaths && part.outputPaths.length > 0) {
        for (const path of part.outputPaths) {
          yield {
            type: "file_change",
            path,
            action: "create" as const,
          };
        }
      }
      break;

    case "step-finish":
      break;

    case "error":
      yield {
        type: "error",
        message: part.text || "未知错误",
      };
      break;

    default:
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

export async function cleanupOpencode(): Promise<void> {
  console.log("[runAgent] 清理（保持 server 运行中）");
}
