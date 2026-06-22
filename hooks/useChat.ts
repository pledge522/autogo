import { useCallback, useRef, useState } from "react";
import type { ChatMessage, SseEvent } from "@/types";

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  /** 当前进度描述（启动引擎、思考中、生成中…），空字符串表示无额外信息 */
  statusText: string;
  sendMessage: (sessionId: string, text: string) => void;
  abort: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  /** 当前正在使用的 EventSource，用于 abort */
  const esRef = useRef<EventSource | null>(null);

  const abort = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    (sessionId: string, text: string) => {
      // 追加用户消息
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStatusText("正在连接...");

      // 准备接收 AI 回复
      const assistantId = `assistant-${Date.now()}`;
      let assistantText = "";

      // 创建 assistant 消息占位
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      // 关闭旧的 EventSource（如果有）
      esRef.current?.close();

      // 构建 GET URL — EventSource 原生 API
      const params = new URLSearchParams({ sessionId, message: text });
      const url = `/api/chat?${params.toString()}`;
      const es = new EventSource(url);
      esRef.current = es;

      console.log("[useChat] EventSource 已创建, url=%s", url);

      es.onmessage = (e: MessageEvent) => {
        try {
          const event: SseEvent = JSON.parse(e.data);
          console.log("[useChat] SSE 事件:", event.type,
            event.type === "text_delta" ? (event as { text: string }).text.slice(0, 30) :
            event.type === "tool_call" ? (event as { name: string }).name :
            event.type === "status" ? (event as { message: string }).message : "");

          switch (event.type) {
            case "status":
              setStatusText(event.message);
              break;

            case "text_delta":
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id === assistantId && msg.role === "assistant") {
                    const newText = (msg.content || "") + event.text;
                    assistantText = newText;
                    return { ...msg, content: newText };
                  }
                  return msg;
                })
              );
              break;

            case "tool_call":
              setMessages((prev) => [
                ...prev,
                {
                  id: `tool-call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  role: "tool_call",
                  name: event.name,
                  input: event.input,
                },
              ]);
              break;

            case "tool_result":
              setMessages((prev) => [
                ...prev,
                {
                  id: `tool-result-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  role: "tool_result",
                  name: event.name,
                  output: event.output,
                },
              ]);
              break;

            case "error":
              setStatusText("");
              setMessages((prev) => [
                ...prev,
                {
                  id: `error-${Date.now()}`,
                  role: "error",
                  content: event.message,
                },
              ]);
              break;

            case "complete":
              es.close();
              esRef.current = null;
              setIsLoading(false);
              setStatusText("");
              break;
          }
        } catch {
          // 忽略解析错误
        }
      };

      let wasOpen = false;
      es.onopen = () => { wasOpen = true; };

      es.onerror = () => {
        console.error("[useChat] EventSource 错误 readyState=%d wasOpen=%s", es.readyState, wasOpen);
        if (es.readyState === EventSource.CLOSED) {
          // 正常关闭（es.close() 被调用）
          setIsLoading(false);
          setStatusText("");
          esRef.current = null;
        } else if (wasOpen) {
          // 曾经连接成功但现在断了 → 非预期断连，关闭并报错
          es.close();
          esRef.current = null;
          setIsLoading(false);
          setStatusText("");
          setMessages((prev) => [
            ...prev,
            { id: `error-${Date.now()}`, role: "error", content: "连接中断，请重试" },
          ]);
        }
        // 否则：从未成功连接（CONNECTING 状态），EventSource 会自动重试，不必干预
      };
    },
    []
  );

  return { messages, isLoading, statusText, sendMessage, abort };
}
