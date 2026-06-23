"use client";

import { Terminal, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface CommandOutputProps {
  command: string;
  output?: string;
  exitCode?: number;
}

/**
 * 命令执行输出组件 - 展示 bash 命令的执行过程和结果
 */
export function CommandOutput({ command, output, exitCode }: CommandOutputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2"
    >
      {/* 命令头 */}
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
        <Terminal size={14} className="text-amber-600" />
        <span className="font-mono text-gray-700">{command}</span>
      </div>

      {/* 输出内容 */}
      {(output || exitCode !== undefined) && (
        <div className="ml-6 mt-1.5 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
          {output && (
            <pre className="text-xs text-gray-700 p-3 max-h-48 overflow-auto font-mono whitespace-pre-wrap break-all">
              {output}
            </pre>
          )}

          {exitCode !== undefined && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-t ${
                exitCode === 0
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {exitCode === 0 ? (
                <CheckCircle size={12} />
              ) : (
                <XCircle size={12} />
              )}
              <span className="font-medium">退出码：{exitCode}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
