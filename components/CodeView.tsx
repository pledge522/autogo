"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeViewProps {
  filename: string;
  code: string;
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    css: "css",
    html: "html",
    json: "json",
    md: "markdown",
    svg: "markup",
  };
  return map[ext] || "text";
}

export function CodeView({ filename, code }: CodeViewProps) {
  const language = getLanguage(filename);

  return (
    <div className="h-full">
      <div className="flex items-center px-4 py-2 bg-gray-800 text-gray-300 text-xs font-mono border-b border-gray-700">
        {filename}
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers
        customStyle={{
          margin: 0,
          borderRadius: 0,
          height: "calc(100% - 33px)",
          fontSize: "13px",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
