"use client";

import { useRef, useEffect } from "react";
import type { ChatMessage as ChatMessageType } from "@/types";
import { ChatMessage } from "./ChatMessage";
import { Bot, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ChatPanelProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  /** 当前进度描述，有值时显示具体阶段而非通用 "正在思考" */
  statusText: string;
}

export function ChatPanel({ messages, isLoading, statusText }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 状态栏 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shrink-0">
        {isLoading ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium text-blue-600">
              {statusText || "Agent 正在思考..."}
            </span>
          </>
        ) : (
          <>
            <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></span>
            <span className="text-sm text-gray-500 font-medium">就绪</span>
          </>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <Bot size={64} className="mx-auto mb-4 text-blue-200" />
                <Sparkles
                  size={20}
                  className="absolute top-0 right-1/2 text-blue-400"
                />
              </div>
              <p className="text-lg font-semibold text-gray-600 mb-2">Vibe Coding</p>
              <p className="text-sm text-gray-400 text-center mb-6">
                描述你想要的应用，AI 会帮你生成代码并实时预览
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300 font-medium">💡 试试这些：</p>
                <motion.p
                  whileHover={{ x: 4 }}
                  className="text-gray-500 cursor-pointer hover:text-blue-500 transition-colors"
                >
                  • "做一个 Todo 待办应用"
                </motion.p>
                <motion.p
                  whileHover={{ x: 4 }}
                  className="text-gray-500 cursor-pointer hover:text-blue-500 transition-colors"
                >
                  • "创建一个个人作品集页面"
                </motion.p>
                <motion.p
                  whileHover={{ x: 4 }}
                  className="text-gray-500 cursor-pointer hover:text-blue-500 transition-colors"
                >
                  • "做一个计算器"
                </motion.p>
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatMessage message={msg} />
                </motion.div>
              ))}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
