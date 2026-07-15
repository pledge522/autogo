import { useCallback, useRef, useState } from "react";
import type { ChatMessage, SseEvent } from "@/types";

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
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
  const esRef = useRef<EventSource | null>(null);
  const seenEventIds = useRef<Set<string>>(new Set());
  const isSendingRef = useRef(false);

  const abort = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setIsLoading(false);
    isSendingRef.current = false;
    seenEventIds.current = new Set();
  }, []);

  const sendMessage = useCallback(
    (sessionId: string, text: string) => {
      if (isSendingRef.current) {
        console.warn("[useChat] 正在加载中，忽略重复的 sendMessage 调用");
        return;
      }

      seenEventIds.current = new Set();

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      isSendingRef.current = true;
      setStatusText("正在连接...");

      esRef.current?.close();

      const params = new URLSearchParams({ sessionId, message: text });
      const url = `/api/chat?${params.toString()}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e: MessageEvent) => {
        try {
          const event: SseEvent = JSON.parse(e.data);

          // 去重 key
          let dedupKey: string | null = null;
          switch (event.type) {
            case "thinking":
              dedupKey = `thinking-${event.text.slice(0, 50)}`;
              break;
            case "text_delta":
              dedupKey = `text-${event.text.slice(0, 50)}`;
              break;
            case "tool_call":
              dedupKey = `tool-call-${event.name}-${JSON.stringify(event.input)}`;
              break;
            case "tool_result":
              dedupKey = `tool-result-${event.name}-${event.output.slice(0, 50)}`;
              break;
            case "file_change":
              dedupKey = `file-change-${event.path}-${event.action}`;
              break;
          }

          if (dedupKey) {
            if (seenEventIds.current.has(dedupKey)) {
              return;
            }
            seenEventIds.current.add(dedupKey);
          }

          switch (event.type) {
            case "status":
              setStatusText(event.message);
              break;

            case "thinking":
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
              setMessages((prev) => {
                const lastUserIndex = prev.findLastIndex(m => m.role === "user");
                const lastCommandIndex = prev.findLastIndex(
                  m => m.role === "command_start" || m.role === "command_output" || m.role === "command_complete"
                );
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
              setMessages((prev) => {
                const lastUserIndex = prev.findLastIndex(m => m.role === "user");
                const lastCommandIndex = prev.findLastIndex(
                  m => m.role === "command_start" || m.role === "command_output" || m.role === "command_complete"
                );
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
              setMessages((prev) => {
                const lastUserIndex = prev.findLastIndex(m => m.role === "user");
                const lastAssistantIndex = prev.findLastIndex(m => m.role === "assistant");

                if (lastAssistantIndex >= 0 && lastAssistantIndex > lastUserIndex) {
                  const lastMsg = prev[lastAssistantIndex];
                  const updatedMsg = {
                    ...lastMsg,
                    content: (("content" in lastMsg ? lastMsg.content : "") as string) + event.text,
                  };
                  const newPrev = [...prev];
                  newPrev[lastAssistantIndex] = updatedMsg as any;
                  return newPrev;
                }
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
              isSendingRef.current = false;
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
              isSendingRef.current = false;
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
        es.close();
        esRef.current = null;
        setIsLoading(false);
        isSendingRef.current = false;
        setStatusText("");
        if (wasOpen) {
          setMessages((prev) => [
            ...prev,
            { id: `error-${Date.now()}`, role: "error", content: "连接中断，请重试" },
          ]);
        }
      };
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    isSendingRef.current = false;
  }, []);

  return { messages, isLoading, statusText, sendMessage, abort, setMessages, clearMessages };
}
