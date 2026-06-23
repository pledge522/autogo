import type { ChildProcess } from "child_process";

/** 会话实例 */
export interface SandboxInstance {
  id: string;
  projectDir: string;
  port: number;
  process: ChildProcess | null;
  createdAt: number;
}

/** SSE 事件类型（autogo 内部流转，由 loop-opencode 产出，SseSender 发往前端） */
export type SseEvent =
  | { type: "status"; message: string }
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; name: string; output: string }
  | { type: "file_change"; path: string; action: "create" | "modify" | "delete"; content?: string }
  | { type: "thinking"; text: string }
  | { type: "command_start"; command: string }
  | { type: "command_output"; output: string }
  | { type: "command_complete"; exitCode: number }
  | { type: "error"; message: string }
  | { type: "complete" };

/** 前端聊天消息 */
export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string }
  | { id: string; role: "tool_call"; name: string; input: Record<string, unknown> }
  | { id: string; role: "tool_result"; name: string; output: string }
  | { id: string; role: "file_change"; path: string; action: "create" | "modify" | "delete"; content?: string }
  | { id: string; role: "thinking"; text: string }
  | { id: string; role: "command_start"; command: string }
  | { id: string; role: "command_output"; output: string }
  | { id: string; role: "command_complete"; exitCode: number }
  | { id: string; role: "error"; content: string };
