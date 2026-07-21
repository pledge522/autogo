"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Code, Zap, Layers } from "lucide-react";

export default function Home() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: Zap,
      title: "快速启动",
      description: "无需配置，打开即用",
      color: "from-yellow-400 to-orange-500",
    },
    {
      icon: Code,
      title: "AI 编码",
      description: "多轮迭代，自动修复错误",
      color: "from-blue-400 to-indigo-500",
    },
    {
      icon: Layers,
      title: "实时预览",
      description: "Vite HMR 自动热更新",
      color: "from-purple-400 to-pink-500",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Vibe Coding
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/history-teacher"
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-red-700 transition-colors"
            >
              史鉴
            </Link>
            <Link
              href="/assistant"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              对话助手
            </Link>
            <Link
              href="/builder"
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              开始创建
            </Link>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-8"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              AI 驱动的代码生成工具
            </span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            用对话{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              创造应用
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            描述你想要的应用，AI 会帮你实时生成代码并预览。
            <br />
            支持多轮迭代，自动修复错误。
          </p>

          <Link
            href="/builder"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold text-lg shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300"
          >
            开始创建
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </motion.div>

        {/* 功能卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mt-24 max-w-4xl"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
              className="group relative p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}
              />
              <feature.icon className={`w-10 h-10 mb-4 bg-gradient-to-br ${feature.color} p-2 rounded-xl text-white`} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* 底部 */}
      <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        <p>Powered by Next.js + Claude API + Vite</p>
      </footer>
    </div>
  );
}
