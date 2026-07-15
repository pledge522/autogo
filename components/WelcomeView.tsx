"use client";

import { motion } from "framer-motion";
import { Sparkles, MessageSquare } from "lucide-react";

export function WelcomeView() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-xl px-8"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>

        {/* 标题 */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-3xl font-bold text-gray-900 mb-3"
        >
          开始创建
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-gray-500 mb-8"
        >
          告诉 AI 你想做什么，它来帮你实现
        </motion.p>

        {/* 提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600"
        >
          <MessageSquare size={14} className="text-gray-400" />
          <span>在左侧输入框开始对话</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
