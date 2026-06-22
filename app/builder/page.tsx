"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useChat } from "@/hooks/useChat";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatInput } from "@/components/ChatInput";
import { PreviewPanel, type ViteError } from "@/components/PreviewPanel";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function BuilderPage() {
  const { session, isReady, createSession } = useSession();
  const { messages, isLoading, statusText, sendMessage, abort } = useChat();
  const [viteError, setViteError] = useState<ViteError | null>(null);
  const autoFixingRef = useRef(false);
  const lastErrorRef = useRef<string>("");

  // 页面加载时自动创建会话
  useEffect(() => {
    createSession();
  }, [createSession]);

  // 检测到 Vite 错误时，自动让 Agent 修复
  useEffect(() => {
    if (!viteError || !session || autoFixingRef.current) return;

    const errorKey = viteError.message.slice(0, 150);
    if (errorKey === lastErrorRef.current) return;
    lastErrorRef.current = errorKey;
    autoFixingRef.current = true;

    console.log('[Auto Fix] 检测到 Vite 错误:', viteError.message.slice(0, 100));

    // 延迟 1.5 秒再修复，等 Vite 完全报告错误
    const timer = setTimeout(() => {
      const fixPrompt = `【自动修复】代码有编译错误，页面无法显示，请修复它。

错误信息：
${viteError.message}
${viteError.file ? `文件：${viteError.file}` : ''}
${viteError.line ? `行号：${viteError.line}` : ''}

修复步骤：
1. 先 read_file 读取报错的文件，查看当前内容
2. 分析问题原因（可能是引用了不存在的组件/文件）
3. 使用 write_file 重写整个文件，修复问题
4. 不要引用不存在的组件，所有代码写在一个文件里

修复后 Vite 会自动热更新，如果还有错误我会继续告诉你。`;

      console.log('[Auto Fix] 发送修复请求...');
      sendMessage(session.id, fixPrompt);
    }, 1500);

    return () => clearTimeout(timer);
  }, [viteError, session, sendMessage]);

  // Agent 完成一轮后，等待并检查是否有 Vite 错误
  useEffect(() => {
    if (isLoading || !session) return;

    // Agent 刚完成，等待 2 秒让 Vite 编译完成
    const timer = setTimeout(() => {
      if (viteError && !autoFixingRef.current) {
        console.log('[Auto Check] Agent 完成后检测到错误');
        // 错误会自动触发上面的修复逻辑
      } else if (!viteError) {
        console.log('[Auto Check] 页面编译成功');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoading, session]); // 移除 viteError 依赖，避免循环

  const handleSend = useCallback(
    (text: string) => {
      if (!session) return;
      sendMessage(session.id, text);
    },
    [session, sendMessage]
  );

  const handleClearError = useCallback(() => {
    setViteError(null);
    autoFixingRef.current = false;
    lastErrorRef.current = "";
  }, []);

  // 环境未准备好时显示 Loading
  if (!isReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-6"
          />
          <p className="text-lg font-medium text-gray-700 mb-2">正在初始化沙箱环境</p>
          <p className="text-sm text-gray-500">安装依赖 + 启动开发服务器，请稍候...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-6 py-3 bg-white/90 backdrop-blur-xl border-b border-gray-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-6 h-6 text-blue-600" />
          </motion.div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Vibe Coding
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {viteError && (
            <Button
              variant="outline"
              onClick={handleClearError}
              className="h-8 px-3 text-xs gap-1.5"
            >
              <Wand2 size={12} />
              忽略错误
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={createSession}
            className="h-8 px-3 text-xs gap-1.5"
          >
            新建项目
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex min-h-0 p-4 gap-4">
        {/* 左侧：聊天面板 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="w-[40%] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-lg min-w-[360px] overflow-hidden"
        >
          <ChatPanel messages={messages} isLoading={isLoading} statusText={statusText} />
          <ChatInput
            onSend={handleSend}
            onAbort={abort}
            isLoading={isLoading}
          />
        </motion.div>

        {/* 右侧：预览面板 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
        >
          <PreviewPanel
            sessionId={session!.id}
            port={session!.port}
            onViteError={setViteError}
          />
        </motion.div>
      </div>
    </div>
  );
}
