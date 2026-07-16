"use client";

import type { ChatMessage as ChatMessageType } from "@/types";
import { User, Bot, Wrench, AlertCircle, FileCode, Terminal, CheckCircle, Brain, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { ThinkingProcess } from "./ThinkingProcess";
import { FileChangeItem } from "./FileChangeItem";
import { CommandOutput } from "./CommandOutput";
import { QuestionMessage } from "./QuestionMessage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface ChatMessageProps {
  message: ChatMessageType;
  onSubmitAnswer?: (answers: Record<string, string>) => void;
}

export function ChatMessage({ message, onSubmitAnswer }: ChatMessageProps) {
  switch (message.role) {
    case "user":
      return <UserMessage content={message.content} />;
    case "assistant":
      return <AssistantMessage content={message.content} />;
    case "tool_call":
      return <ToolCallMessage name={message.name} input={message.input} />;
    case "tool_result":
      return <ToolResultMessage name={message.name} output={message.output} />;
    case "thinking":
      return <ThinkingMessage text={message.text} />;
    case "file_change":
      return <FileChangeMessage path={message.path} action={message.action} content={message.content} />;
    case "command_start":
    case "command_output":
    case "command_complete":
      // 这些由 CommandOutput 统一处理，在 ChatPanel 中聚合展示
      return null;
    case "error":
      return <ErrorMessage content={message.content} />;
    case "question":
      return <QuestionMessage questions={message.questions} onSubmitAnswer={onSubmitAnswer} />;
  }
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
        <User size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 mb-1">You</p>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl rounded-tl-none px-4 py-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  if (!content) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex gap-3 py-2"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
          <Bot size={14} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 mb-1">AI</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-gray-400">思考中...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3 py-2"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
        <Bot size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 mb-1">AI</p>
        <div className="bg-gray-50 rounded-2xl rounded-tl-none px-4 py-3 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-headings:my-2">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              // 自定义代码块样式
              code({ node, className, children, ...props }: any) {
                const isInline = !children?.some?.((c: any) => c === '\n');
                if (isInline) {
                  return <code className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono text-pink-600" {...props}>{children}</code>;
                }
                return <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 overflow-x-auto text-xs font-mono"><code {...props}>{children}</code></pre>;
              },
              // 自定义列表样式
              ul: ({ children }: any) => <ul className="list-disc list-inside text-gray-700 space-y-1">{children}</ul>,
              ol: ({ children }: any) => <ol className="list-decimal list-inside text-gray-700 space-y-1">{children}</ol>,
              li: ({ children }: any) => <li className="ml-2 text-gray-700">{children}</li>,
              // 标题样式
              h1: ({ children }: any) => <h1 className="text-lg font-bold text-gray-900 mt-3 mb-2">{children}</h1>,
              h2: ({ children }: any) => <h2 className="text-base font-semibold text-gray-900 mt-2 mb-1">{children}</h2>,
              h3: ({ children }: any) => <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{children}</h3>,
              // 段落样式
              p: ({ children }: any) => <p className="text-gray-700 my-1">{children}</p>,
              // 表格样式
              table: ({ children }: any) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-gray-300 text-xs">{children}</table></div>,
              th: ({ children }: any) => <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold">{children}</th>,
              td: ({ children }: any) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
              // 引用样式
              blockquote: ({ children }: any) => <blockquote className="border-l-2 border-gray-300 pl-3 text-gray-600 italic my-2">{children}</blockquote>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}

function ToolCallMessage({ name, input }: { name: string; input: Record<string, unknown> }) {
  const isFileOp = name === "write" || name === "edit" || name === "read" || name === "glob" || name === "grep";
  const isBash = name === "bash" || name === "shell";
  const displayPath = (input.path || input.filePath || input.file || "") as string;
  const displayCommand = (input.command || "") as string;
  const displayDesc = (input.description || "") as string;
  const displayPrompt = (input.prompt || "") as string;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex gap-3 py-1.5 ml-11"
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
        {isFileOp ? (
          <FileCode size={11} className="text-white" />
        ) : isBash ? (
          <Terminal size={11} className="text-white" />
        ) : (
          <Wrench size={11} className="text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
            {name}
          </span>
          {displayPath && (
            <span className="text-xs text-gray-500 truncate font-mono bg-gray-100 px-2 py-0.5 rounded">
              {displayPath}
            </span>
          )}
          {displayCommand && (
            <span className="text-xs text-gray-500 truncate font-mono bg-gray-100 px-2 py-0.5 rounded">
              {displayCommand}
            </span>
          )}
          {displayDesc && !displayPath && !displayCommand && (
            <span className="text-xs text-gray-600 truncate">{displayDesc}</span>
          )}
        </div>
        {displayPrompt && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5 font-mono whitespace-pre-wrap break-all max-h-20 overflow-y-auto border border-gray-100">
            {displayPrompt.length > 500 ? displayPrompt.slice(0, 500) + "…" : displayPrompt}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ToolResultMessage({ name, output }: { name: string; output: string }) {
  const isError = output.startsWith("Error:");
  const isSuccess = output.startsWith("OK:") || output.startsWith("✓");
  const isTruncated = output.length > 500;
  const display = isTruncated ? output.slice(0, 500) + "..." : output;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="ml-11 mb-2"
    >
      <div
        className={`text-xs font-mono rounded-xl p-3 max-h-48 overflow-auto border ${
          isError
            ? "bg-red-50 text-red-700 border-red-200"
            : isSuccess
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-gray-50 text-gray-600 border border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {isSuccess && <CheckCircle size={12} className="text-green-600" />}
          {isError && <AlertCircle size={12} className="text-red-600" />}
          <span className="font-medium opacity-75">{name}</span>
        </div>
        <pre className="whitespace-pre-wrap break-all text-xs">{display}</pre>
      </div>
    </motion.div>
  );
}

function ThinkingMessage({ text }: { text: string }) {
  return <ThinkingProcess text={text} title="思考过程" defaultExpanded={true} />;
}

function FileChangeMessage({ path, action, content }: { path: string; action: "create" | "modify" | "delete"; content?: string }) {
  return <FileChangeItem path={path} action={action} content={content} />;
}

function ErrorMessage({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3 py-2 mx-4"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
        <AlertCircle size={14} className="text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">{content}</p>
      </div>
    </motion.div>
  );
}
