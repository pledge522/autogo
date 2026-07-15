"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";

interface FileTreeProps {
  sessionId: string;
  onSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const isDir = file.endsWith("/");
    const cleanPath = isDir ? file.slice(0, -1) : file;
    const parts = cleanPath.split("/");

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join("/");
      const isLast = i === parts.length - 1;
      const isDirPart = isLast ? isDir : true;

      let existing = current.find((n) => n.name === name && n.isDir === isDirPart);
      if (!existing) {
        existing = {
          name,
          path,
          isDir: isDirPart,
          children: [],
        };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  // 排序：目录在前，文件名排序
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  }
  sortNodes(root);

  return root;
}

function TreeNodeItem({
  node,
  depth,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown size={14} className="text-gray-400 shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-gray-400 shrink-0" />
          )}
          <Folder size={14} className="text-blue-400 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className="flex items-center gap-1 w-full px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <span className="w-[14px]" /> {/* 占位对齐 */}
      <File size={14} className="text-gray-400 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ sessionId, onSelect }: FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTree([]); // 先清空旧文件树
    fetch(`/api/files?id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setTree(buildTree(data.files));
        }
      })
      .catch(() => {
        setTree([]);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-400">加载中...</div>;
  }

  if (tree.length === 0) {
    return <div className="p-4 text-sm text-gray-400">暂无文件</div>;
  }

  return (
    <div className="py-2">
      {tree.map((node) => (
        <TreeNodeItem key={node.path} node={node} depth={0} onSelect={onSelect} />
      ))}
    </div>
  );
}
