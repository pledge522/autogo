import type { SseEvent } from "@/types";

/**
 * SSE 事件发送器
 * 封装 SSE data 格式，供 API route 使用
 */
export class SseSender {
  private controller: ReadableStreamDefaultController<Uint8Array>;
  private encoder = new TextEncoder();
  /** 是否已经写入失败（客户端断开），之后调用 send 都抛错以终止循环 */
  private broken = false;

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller;
  }

  /**
   * 发送一个 SSE 事件。
   * 如果客户端已断开，首次失败会记录日志并设置 broken 标记；
   * 后续调用直接抛出，由上层 try-catch 捕获后清理资源。
   */
  send(event: SseEvent): void {
    if (this.broken) {
      throw new Error("SSE 连接已断开");
    }
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      this.controller.enqueue(this.encoder.encode(data));
    } catch (err) {
      this.broken = true;
      console.error("[SseSender] 写入失败，客户端可能已断开:", String(err));
      throw err;
    }
  }

  close(): void {
    if (this.broken) return;
    try {
      this.controller.close();
    } catch {
      // 已关闭，忽略
    }
  }
}
