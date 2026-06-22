"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onAbort, isLoading, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-100 bg-white/80 backdrop-blur-xl p-4">
      <div className="relative">
        <div className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200/50 bg-white focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-300">
          <Sparkles className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "请先创建会话..." : "描述你想做什么... (Enter 发送，Shift+Enter 换行)"}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400
                       focus:outline-none max-h-[200px] leading-relaxed"
          />

          {isLoading ? (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={onAbort}
              className="flex items-center justify-center w-10 h-10 rounded-xl
                         bg-red-500 text-white hover:bg-red-600 transition-all duration-200
                         shadow-lg shadow-red-500/30 shrink-0"
              title="停止生成"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Square size={16} />
            </motion.button>
          ) : (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleSubmit}
              disabled={disabled || !text.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-xl
                         bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                         hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200
                         disabled:bg-gray-200 disabled:shadow-none disabled:cursor-not-allowed shrink-0"
              title="发送"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={16} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
