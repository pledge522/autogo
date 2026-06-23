"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ThinkingProcessProps {
  text: string;
  title?: string;
  defaultExpanded?: boolean;
}

/**
 * 思考过程组件 - 可折叠展示 AI 的分析推理过程
 */
export function ThinkingProcess({ text, title = "思考过程", defaultExpanded = true }: ThinkingProcessProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // 将思考内容按段落拆分
  const lines = text.split("\n").filter(line => line.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
        <Brain size={14} className="text-purple-500" />
        <span>{title}</span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 ml-6 text-xs text-gray-600 space-y-1.5"
          >
            {lines.map((line, idx) => {
              const trimmed = line.trim();

              // 有序列表 (1. 2. 3.)
              if (trimmed.match(/^\d+\./)) {
                return (
                  <div key={idx} className="flex gap-2">
                    <span className="text-gray-400 select-none shrink-0">{trimmed.match(/^\d+\./)?.[0]}</span>
                    <span className="flex-1">{trimmed.replace(/^\d+\.\s*/, "")}</span>
                  </div>
                );
              }
              // 无序列表 (• - *)
              else if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
                return (
                  <div key={idx} className="flex gap-2">
                    <span className="text-blue-400 select-none shrink-0">•</span>
                    <span className="flex-1">{trimmed.replace(/^[-*•]\s*/, "")}</span>
                  </div>
                );
              }
              // 引用 (>)
              else if (trimmed.startsWith(">")) {
                return (
                  <div key={idx} className="ml-2 pl-2 border-l-2 border-purple-200 text-gray-500 italic">
                    {trimmed.replace(/^>\s*/, "")}
                  </div>
                );
              }
              // 强调文本 (**)
              else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
                return (
                  <div key={idx} className="font-semibold text-gray-800">
                    {trimmed.replace(/^\*\*|\*\*$/g, "")}
                  </div>
                );
              }
              // 普通段落
              else {
                return <div key={idx} className="leading-relaxed">{trimmed}</div>;
              }
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
