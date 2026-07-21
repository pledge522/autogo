import { useCallback, useRef, useState, useEffect } from "react";
import type { ChatMessage, SseEvent } from "@/types";

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  statusText: string;
  sendMessage: (sessionId: string, text: string) => void;
  submitAnswer: (answers: Record<string, string>) => void;
  abort: () => void;
  setMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
  loadMessages: (sessionId: string) => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<{
    questions: { question: string; header: string; options: { label: string; description?: string; preview?: string }[]; multiple?: boolean }[];
    sessionId: string;
  } | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const seenEventIds = useRef<Set<string>>(new Set());
  const isSendingRef = useRef(false);
  const currentSessionId = useRef<string | null>(null);

  // 当消息变化时，自动保存到磁盘
  useEffect(() => {
    if (currentSessionId.current && messages.length > 0) {
      // 防抖：延迟 1 秒后保存
      const timer = setTimeout(() => {
        fetch(`/api/chat-history?id=${currentSessionId.current}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        }).catch(err => {
          console.error("保存聊天记录失败:", err);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const abort = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setIsLoading(false);
    isSendingRef.current = false;
    seenEventIds.current = new Set();
  }, []);

  const sendMessage = useCallback(
    (sessionId: string, text: string) => {
      currentSessionId.current = sessionId;

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

      const controller = new AbortController();
      const signal = controller.signal;
      const abortHandler = () => controller.abort();
      signal.addEventListener("abort", () => {
        esRef.current = null;
        setIsLoading(false);
        isSendingRef.current = false;
      });

      (async () => {
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, message: text }),
            signal,
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const reader = res.body?.getReader();
          if (!reader) throw new Error("响应体不可读");

          let buffer = "";
          const decoder = new TextDecoder();

          const processLine = (line: string) => {
            if (!line.startsWith("data: ")) return;
            try {
              const event: SseEvent = JSON.parse(line.slice(6));

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
                case "question":
                  dedupKey = `question-${JSON.stringify(event.questions[0]?.question || "").slice(0, 50)}`;
                  break;
              }

              if (dedupKey) {
                if (seenEventIds.current.has(dedupKey)) return;
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

                case "question":
                  setPendingQuestion({
                    questions: event.questions,
                    sessionId: currentSessionId.current || "",
                  });
                  setIsLoading(false);
                  isSendingRef.current = false;
                  setStatusText("");
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      role: "question",
                      questions: event.questions,
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
                  controller.abort();
                  setIsLoading(false);
                  isSendingRef.current = false;
                  setStatusText("");
                  break;
              }
            } catch {
              // 忽略解析错误
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) processLine(trimmed);
            }
          }

          // 处理最后残留的行
          if (buffer.trim()) processLine(buffer.trim());
        } catch (err: unknown) {
          if ((err as Error)?.name === "AbortError") return;
          const errorMsg = err instanceof Error ? err.message : String(err);
          esRef.current = null;
          setIsLoading(false);
          isSendingRef.current = false;
          setStatusText("");
          setMessages((prev) => [
            ...prev,
            { id: `error-${Date.now()}`, role: "error", content: errorMsg },
          ]);
        }
      })();

      esRef.current = { close: () => controller.abort() } as unknown as EventSource;
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    isSendingRef.current = false;
    setIsLoading(false);
    setStatusText("");
    currentSessionId.current = null;
    setPendingQuestion(null);
  }, []);

  const loadMessages = useCallback((sessionId: string) => {
    currentSessionId.current = sessionId;
    fetch(`/api/chat-history?id=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(err => {
        console.error("加载聊天记录失败:", err);
      });
  }, []);

  const submitAnswer = useCallback((answers: Record<string, string>) => {
    if (!currentSessionId.current || !pendingQuestion) return;

    // 将答案格式化为文本消息发送
    const answerText = Object.entries(answers)
      .map(([question, answer]) => `${question}: ${answer}`)
      .join("\n");

    // 更新消息，标记问题已回答
    setMessages((prev) => prev.map(msg => {
      if (msg.role === "question" && !msg.selectedAnswers) {
        return { ...msg, selectedAnswers: answers };
      }
      return msg;
    }));

    // 清除等待状态
    setPendingQuestion(null);

    // 发送答案
    sendMessage(currentSessionId.current, answerText);
  }, [pendingQuestion, sendMessage]);

  return { messages, isLoading, statusText, sendMessage, submitAnswer, abort, setMessages, clearMessages, loadMessages };
}
