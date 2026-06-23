"use client";

import { FileCode, FilePlus, FileMinus, FileDiff } from "lucide-react";
import { motion } from "framer-motion";

interface FileChangeItemProps {
  path: string;
  action: "create" | "modify" | "delete";
  content?: string;
}

const actionConfig = {
  create: {
    icon: FilePlus,
    label: "创建",
    bgClass: "bg-green-50",
    textClass: "text-green-700",
    borderClass: "border-green-200",
    iconBgClass: "bg-green-500",
  },
  modify: {
    icon: FileDiff,
    label: "修改",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
    iconBgClass: "bg-blue-500",
  },
  delete: {
    icon: FileMinus,
    label: "删除",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
    iconBgClass: "bg-red-500",
  },
};

/**
 * 文件变更项组件 - 展示单个文件的创建/修改/删除
 */
export function FileChangeItem({ path, action, content }: FileChangeItemProps) {
  const config = actionConfig[action];
  const Icon = config.icon;

  // 提取文件名
  const fileName = path.split("/").pop() || path;
  const dirPath = path.substring(0, path.length - fileName.length);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 text-xs font-mono rounded-lg border px-2.5 py-2 ${config.bgClass} ${config.borderClass}`}
    >
      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${config.iconBgClass}`}>
        <Icon size={12} className="text-white" />
      </div>
      <div className="flex-1 min-w-0 flex items-baseline gap-1">
        <span className={`font-medium ${config.textClass}`}>{config.label}</span>
        <span className="text-gray-600 truncate" title={path}>
          {fileName}
        </span>
        {dirPath && (
          <span className="text-gray-400 truncate shrink-0 hidden sm:inline">{dirPath}</span>
        )}
      </div>
    </motion.div>
  );
}
