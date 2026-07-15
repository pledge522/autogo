"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, Code2, FolderTree, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { CodeView } from "./CodeView";
import { FileTree } from "./FileTree";
import { WelcomeView } from "./WelcomeView";

type Tab = "preview" | "code" | "files";

export interface ViteError {
  message: string;
  file?: string;
  line?: number;
}

interface PreviewPanelProps {
  sessionId: string | null;
  port: number | null;
  onViteError?: (error: ViteError | null) => void;
}

export function PreviewPanel({ sessionId, port, onViteError }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [iframeKey, setIframeKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const [projectIsEmpty, setProjectIsEmpty] = useState(true);
  const errorRef = useRef<ViteError | null>(null);

  // 会话变化时重置选中文件
  useEffect(() => {
    setSelectedFile(null);
    setFileContent("");
  }, [sessionId]);

  // 检测项目是否已有文件（定期轮询）
  useEffect(() => {
    if (!sessionId) return;

    const checkProjectFiles = async () => {
      try {
        const res = await fetch(`/api/files?id=${sessionId}`);
        const data = await res.json();
        // 如果 files 数组中有 index.html 或 src/ 目录，说明项目已经有内容
        const hasContent = data.files && data.files.length > 0;
        setProjectIsEmpty(!hasContent);
      } catch {
        setProjectIsEmpty(true);
      }
    };

    // 立即检查一次
    checkProjectFiles();

    // 每 2 秒检查一次，项目生成后自动切换
    const interval = setInterval(checkProjectFiles, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // 监听 iframe 的 postMessage（Vite HMR 错误）
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Vite 的 HMR 错误通过 postMessage 发送
      if (event.data?.type === 'vite:error' || event.data?.type === 'vite:before-error') {
        const err: ViteError = {
          message: event.data?.err?.message || event.data?.message || 'Unknown error',
          file: event.data?.file || event.data?.err?.file,
          line: event.data?.line || event.data?.err?.line,
        };
        errorRef.current = err;
        setHasError(true);
        onViteError?.(err);
        console.log('[Vite Error]', err);
      }
      // Vite 错误修复后（成功热更新）
      if (event.data?.type === 'vite:after-update' || event.data?.type === 'vite:before-update') {
        setHasError(false);
        onViteError?.(null);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onViteError]);

  // 当选中文件时加载内容
  useEffect(() => {
    if (!sessionId || !selectedFile) return;

    // 大文件不加载（> 50KB 的文件在文件列表中已过滤，这里作为保险）
    fetch(`/api/files?id=${sessionId}&path=${encodeURIComponent(selectedFile)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          // 内容超过 1000 行只展示前 1000 行
          const lines = data.content.split('\n');
          if (lines.length > 1000) {
            setFileContent(lines.slice(0, 1000).join('\n') + '\n\n// ... 文件过长，只展示前 1000 行');
          } else {
            setFileContent(data.content);
          }
        }
      })
      .catch(() => {
        setFileContent("// 加载失败");
      });
  }, [sessionId, selectedFile]);

  const refreshPreview = useCallback(() => {
    setIframeKey((k) => k + 1);
    setHasError(false);
    errorRef.current = null;
  }, []);

  if (!sessionId || !port) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Eye size={48} className="mx-auto mb-4 opacity-30" />
          <p>创建会话后预览将在这里显示</p>
        </div>
      </div>
    );
  }

  const previewUrl = `http://localhost:${port}`;

  const tabs: { key: Tab; label: string; icon: typeof Eye }[] = [
    { key: "preview", label: "Preview", icon: Eye },
    { key: "code", label: "Code", icon: Code2 },
    { key: "files", label: "Files", icon: FolderTree },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Tab 栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shrink-0">
        <div className="flex gap-1 bg-gray-100/50 p-1 rounded-xl">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === key
                  ? "bg-white text-gray-900 shadow-sm shadow-gray-200/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {hasError && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium border border-red-200"
            >
              <AlertTriangle size={12} />
              <span>编译错误</span>
            </motion.div>
          )}
          <button
            onClick={refreshPreview}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新预览"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 relative bg-gray-50">
        {activeTab === "preview" && (
          projectIsEmpty ? (
            <WelcomeView />
          ) : (
            <iframe
              key={iframeKey}
              src={previewUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              title="Preview"
            />
          )
        )}
        {activeTab === "code" && (
          <div className="flex h-full">
            <div className="w-56 border-r border-gray-200 bg-white overflow-y-auto">
              <FileTree
                key={sessionId}
                sessionId={sessionId}
                onSelect={(path) => {
                  setSelectedFile(path);
                }}
              />
            </div>
            <div className="flex-1 overflow-auto">
              {selectedFile ? (
                <CodeView filename={selectedFile} code={fileContent} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  从左侧选择一个文件查看
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "files" && (
          <div className="h-full overflow-y-auto p-4 bg-white">
            <FileTree
              key={sessionId}
              sessionId={sessionId}
              onSelect={(path) => {
                setSelectedFile(path);
                setActiveTab("code");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
