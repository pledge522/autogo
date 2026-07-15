"use client";

import { motion } from "framer-motion";
import { Sparkles, Code, Zap, MessageSquare } from "lucide-react";

export function WelcomeView() {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl px-8"
      >
        {/* Logo 动画 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl shadow-blue-500/30 mb-8"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>

        {/* 标题 */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-5xl font-bold text-gray-900 mb-4 tracking-tight"
        >
          Vibe Coding
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-xl text-gray-600 mb-12"
        >
          告诉 AI 你想做什么，它来帮你实现
        </motion.p>

        {/* 功能提示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="grid grid-cols-3 gap-6 mb-12"
        >
          <div className="flex flex-col items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <p className="text-sm text-gray-700 font-medium">对话创建</p>
          </div>
          <div className="flex flex-col items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm">
            <Code className="w-6 h-6 text-indigo-600" />
            <p className="text-sm text-gray-700 font-medium">实时预览</p>
          </div>
          <div className="flex flex-col items-center gap-3 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm">
            <Zap className="w-6 h-6 text-purple-600" />
            <p className="text-sm text-gray-700 font-medium">自动迭代</p>
          </div>
        </motion.div>

        {/* 提示文字 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex items-center justify-center gap-2 text-gray-500 text-sm"
        >
          <MessageSquare size={16} />
          <span>在左侧输入框开始对话，创建你的应用</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
