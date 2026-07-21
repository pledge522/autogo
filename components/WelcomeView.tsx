"use client";

import { motion } from "framer-motion";
import { Sparkles, Code, Layout, Calculator, MessageSquare } from "lucide-react";

interface ExamplePrompt {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  prompt: string;
  color: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    icon: Layout,
    title: "个人网站",
    prompt: "创建一个个人作品集页面，包含关于我、项目展示、联系方式三个部分，使用现代简约风格",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Code,
    title: "待办应用",
    prompt: "做一个 Todo 待办应用，支持添加、删除、标记完成，数据本地存储",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Calculator,
    title: "工具",
    prompt: "做一个计算器，支持加减乘除和括号，界面模仿 iPhone 计算器",
    color: "from-violet-500 to-purple-500",
  },
];

export function WelcomeView() {
  const handleExampleClick = (prompt: string) => {
    // 触发自定义事件，让 ChatInput 监听并发送
    window.dispatchEvent(new CustomEvent('send-prompt', { detail: { text: prompt } }));
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl px-8"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-xl shadow-blue-500/20 mb-8"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>

        {/* 主标题 */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-4xl font-bold text-gray-900 mb-4"
        >
          用对话{" "}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            创造应用
          </span>
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-lg text-gray-600 mb-10 max-w-xl mx-auto"
        >
          描述你想要的应用，AI 会帮你实时生成代码并预览。
          <br />
          支持多轮迭代，自动修复错误。
        </motion.p>

        {/* 示例卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="grid sm:grid-cols-3 gap-4 mb-10"
        >
          {EXAMPLE_PROMPTS.map((example, index) => (
            <motion.button
              key={example.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleExampleClick(example.prompt)}
              className="group relative p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 text-left"
            >
              {/* 渐变边框效果 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${example.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />

              {/* 图标 */}
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${example.color} mb-3`}>
                <example.icon className="w-5 h-5 text-white" />
              </div>

              {/* 标题 */}
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
                {example.title}
              </h3>

              {/* 描述 */}
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {example.prompt}
              </p>

              {/* Hover 提示 */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>点击使用</span>
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600"
        >
          <MessageSquare size={14} className="text-gray-400" />
          <span>在左侧输入框描述你的想法，或点击上方示例</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
