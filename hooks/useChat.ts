import { useCallback, useRef, useState } from "react";
import type { ChatMessage, SseEvent } from "@/types";

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  /** 当前进度描述（启动引擎、思考中、生成中…），空字符串表示无额外信息 */
  statusText: string;
  sendMessage: (sessionId: string, text: string) => void;
  abort: () => void;
  setMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
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
          console.log("[useChat] SSE 事件:", event.type, event);

          switch (event.type) {
            case "status":
              setStatusText(event.message);
              break;

            case "thinking":
              // 思考过程作为独立消息
              setMessages((prev) => [
                ...prev,
                {
                  id: `thinking-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  role: "thinking",
                  text: event.text,
                },
              ]);
              break;

            case "file_change":
              // 文件变更作为独立消息
              setMessages((prev) => [
                ...prev,
                {
                  id: `file-change-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  role: "file_change",
                  path: event.path,
                  action: event.action,
                  content: event.content,
                },
              ]);
              break;

            case "command_start":
              // 命令开始
              setMessages((prev) => [
                ...prev,
                {
                  id: `command-start-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  role: "command_start",
                  command: event.command,
                },
              ]);
              break;

            case "command_output":
              // 命令输出 - 追加到上一个 command_start 或 command_output
              setMessages((prev) => {
                // 找到最后一个 user 消息的位置
                const lastUserIndex = prev.findLastIndex(m => m.role === "user");
                const lastCommandIndex = prev.findLastIndex(
                  m => m.role === "command_start" || m.role === "command_output" || m.role === "command_complete"
                );
                // 只有在最后一个 user 消息之后的命令才是当前轮次的
                if (lastCommandIndex >= 0 && lastCommandIndex > lastUserIndex) {
                  const lastMsg = prev[lastCommandIndex];
                  const updatedMsg = {
                    ...lastMsg,
                    output: (lastMsg as any).output ? (lastMsg as any).output + event.output : event.output,
                  };
                  const newPrev = [...prev];
                  newPrev[lastCommandIndex] = updatedMsg as any;
                  return newPrev;
                }
                // 如果没有找到当前轮次的命令消息，创建一个新的
                return [
                  ...prev,
                  {
                    id: `command-output-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    role: "command_output",
                    output: event.output,
                  },
                ];
              });
              break;

            case "command_complete":
              // 命令完成 - 更新上一个命令消息的退出码
              setMessages((prev) => {
                // 找到最后一个 user 消息的位置
                const lastUserIndex = prev.findLastIndex(m => m.role === "user");
                const lastCommandIndex = prev.findLastIndex(
                  m => m.role === "command_start" || m.role === "command_output" || m.role === "command_complete"
                );
                // 只有在最后一个 user 消息之后的命令才是当前轮次的
                if (lastCommandIndex >= 0 && lastCommandIndex > lastUserIndex) {
                  const lastMsg = prev[lastCommandIndex];
                  const updatedMsg = {
                    ...lastMsg,
                    exitCode: event.exitCode,
                  };
                  const newPrev = [...prev];
                  newPrev[lastCommandIndex] = updatedMsg as any;
                  return newPrev;
                }
                return [
                  ...prev,
                  {
                    id: `command-complete-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    role: "command_complete",
                    exitCode: event.exitCode,
                  },
                ];
              });
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

            case "text_delta":
              // AI 回复的文本片段 — 追加到上一个 assistant 消息，或创建新的
              setMessages((prev) => {
                // 找到最后一个 user 消息的位置
                const lastUserIndex = prev.findLastIndex(m => m.role === "user");
                // 找到最后一个 assistant 消息的位置
                const lastAssistantIndex = prev.findLastIndex(m => m.role === "assistant");

                // 只有在最后一个 user 消息之后的 assistant 消息才是当前轮次的，才能更新
                // 如果 assistant 消息在 user 消息之前，说明是上一轮对话的，需要创建新的 assistant 消息
                if (lastAssistantIndex >= 0 && lastAssistantIndex > lastUserIndex) {
                  // 追加到已有的 assistant 消息
                  const lastMsg = prev[lastAssistantIndex];
                  const updatedMsg = {
                    ...lastMsg,
                    content: (lastMsg.content || "") + event.text,
                  };
                  const newPrev = [...prev];
                  newPrev[lastAssistantIndex] = updatedMsg;
                  return newPrev;
                }
                // 创建新的 assistant 消息
                return [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    role: "assistant",
                    content: event.text,
                  },
                ];
              });
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

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, statusText, sendMessage, abort, setMessages, clearMessages };
}
