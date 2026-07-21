"use client";

import { useState, useCallback, useRef } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatInput } from "@/components/ChatInput";
import type { ChatMessage } from "@/types";
import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const abortRef = useRef<() => void>(() => {});

  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStatusText("AI 正在回复...");

    const controller = new AbortController();
    abortRef.current = () => controller.abort();

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
            role: m.role,
            content: ("content" in m ? m.content : "") as string,
          })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("响应体不可读");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(trimmed.slice(6));

            if (event.type === "text_delta") {
              assistantContent += event.text;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  const updated = { ...last, content: (last as any).content + event.text };
                  return [...prev.slice(0, -1), updated as ChatMessage];
                }
                return [...prev, { id: `assistant-${Date.now()}`, role: "assistant", content: event.text } as ChatMessage];
              });
            } else if (event.type === "error") {
              setMessages((prev) => [
                ...prev,
                { id: `error-${Date.now()}`, role: "error", content: event.content } as ChatMessage,
              ]);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 处理残留
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const event = JSON.parse(trimmed.slice(6));
            if (event.type === "text_delta" && event.text) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  const updated = { ...last, content: (last as any).content + event.text };
                  return [...prev.slice(0, -1), updated as ChatMessage];
                }
                return [...prev, { id: `assistant-${Date.now()}`, role: "assistant", content: event.text } as ChatMessage];
              });
            }
          } catch {
            // 忽略
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "error", content: errorMsg } as ChatMessage,
      ]);
    } finally {
      setIsLoading(false);
      setStatusText("");
    }
  }, [messages]);

  const handleAbort = useCallback(() => {
    abortRef.current();
    setIsLoading(false);
    setStatusText("");
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100">
      <header className="flex items-center justify-between px-6 py-3 bg-white/90 backdrop-blur-xl border-b border-gray-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            对话助手
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Plus size={14} />
            新对话
          </button>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          statusText={statusText}
        />
        <ChatInput
          onSend={handleSend}
          onAbort={handleAbort}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
