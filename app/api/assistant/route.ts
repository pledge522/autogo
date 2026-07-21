import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/model-config";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "无效的消息列表" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const modelConfig = getDefaultModel();

    if (!modelConfig) {
      return new Response(
        JSON.stringify({ error: "未配置模型，请在 secret.txt 中配置 API 密钥" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(`${modelConfig.url}/v1/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${modelConfig.apiKey}`,
            },
            body: JSON.stringify({
              model: modelConfig.name,
              messages: [
                { role: "system", content: "你是一个智能对话助手，用中文回答用户的问题。回答简洁清晰，有需要时可以使用 Markdown 格式。" },
                ...messages,
              ],
              temperature: 0.7,
              max_tokens: 4096,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            const data = `data: ${JSON.stringify({ type: "error", content: `API 请求失败: ${response.status} ${errorText}` })}\n\n`;
            controller.enqueue(encoder.encode(data));
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("响应体不可读");

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || "";
                if (content) {
                  const sseData = `data: ${JSON.stringify({ type: "text_delta", text: content })}\n\n`;
                  controller.enqueue(encoder.encode(sseData));
                }
              } catch {
                // 忽略解析错误
              }
            }
          }

          // 处理残留数据
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith("data: ")) {
              const data = trimmed.slice(6);
              if (data !== "[DONE]") {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    const sseData = `data: ${JSON.stringify({ type: "text_delta", text: content })}\n\n`;
                    controller.enqueue(encoder.encode(sseData));
                  }
                } catch {
                  // 忽略
                }
              }
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const data = `data: ${JSON.stringify({ type: "error", content: message })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        }
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
  } catch {
    return new Response(
      JSON.stringify({ error: "请求处理失败" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
