/**
 * opencode 客户端
 *
 * 通过 HTTP 直接调用 opencode server API
 * 使用 instance httpapi 的真实端点和请求格式
 */

/** opencode API 错误，携带 HTTP 状态码便于上层按 409/404 等分支处理 */
export class OpencodeApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "OpencodeApiError";
    this.status = status;
  }
}

export interface OpencodeClientConfig {
  baseUrl: string;
  directory?: string;
  /** 认证密码 */
  password?: string;
  /** 认证用户名，默认 "opencode" */
  username?: string;
}

export interface SessionCreateInput {
  id?: string;
  agent?: string;
  model?: {
    providerID: string;
    id: string;
    variant?: string;
  };
  location?: {
    directory: string;
  };
}

export interface SessionInfo {
  id: string;
  agent: string;
  model: string;
  location: {
    directory: string;
  };
  time: {
    created: number;
    updated: number;
  };
}

export interface SessionCreateResponse {
  data: SessionInfo;
}

// -------- /session/:id/message 的响应类型 --------

/** 消息的单个 part */
export interface MessagePart {
  type: string;
  id?: string;
  text?: string;
  tool?: string;
  input?: Record<string, unknown>;
  content?: unknown;
  outputPaths?: string[];
  snapshot?: string;
  messageID?: string;
  sessionID?: string;
  // reasoning part
  providerMetadata?: Record<string, unknown>;
  // tool part (opencode v1 格式)
  callID?: string;
  state?: {
    status: "pending" | "running" | "completed" | "error";
    input?: Record<string, unknown>;
    output?: string;
    error?: string;
    title?: string;
    time?: { start: number; end?: number };
  };
}

/** 消息元信息 */
export interface MessageInfo {
  id: string;
  sessionID: string;
  role: string;
  mode: string;
  agent: string;
  finish: string;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
  modelID: string;
  providerID: string;
  time: { created: number; completed: number };
}

/** /session/:id/message 返回的完整消息体 */
export interface SessionMessageResponse {
  info: MessageInfo;
  parts: MessagePart[];
}

/** 发送消息的请求体 */
export interface MessageInput {
  /** 用户消息文本 */
  text: string;
  /** @deprecated 不再使用，保留兼容 */
  prompt?: string;
}

export class OpencodeClient {
  private baseUrl: string;
  private directory?: string;
  private authHeader?: string;

  constructor(config: OpencodeClientConfig) {
    this.baseUrl = config.baseUrl;
    this.directory = config.directory;

    if (config.password) {
      const username = config.username || "opencode";
      this.authHeader = `Basic ${Buffer.from(`${username}:${config.password}`).toString("base64")}`;
    }
  }

  private makeHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.directory) {
      headers["x-opencode-directory"] = this.directory;
    }
    if (this.authHeader) {
      headers["Authorization"] = this.authHeader;
    }
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    if (this.directory) {
      url.searchParams.set("directory", this.directory);
    }

    const response = await fetch(url.toString(), {
      method,
      headers: this.makeHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new OpencodeApiError(
        response.status,
        `opencode API error: ${response.status} ${error}`,
      );
    }

    return response.json();
  }

  /** 创建新会话 */
  async createSession(input: SessionCreateInput): Promise<SessionCreateResponse> {
    return this.request("POST", "/api/session", input);
  }

  /** 获取会话信息 */
  async getSession(sessionID: string): Promise<SessionCreateResponse> {
    return this.request("GET", `/api/session/${sessionID}`);
  }

  /**
   * 发送消息并等待 AI 完整回复
   *
   * 使用 instance httpapi 的真实端点：
   *   POST /session/:id/message
   *   body: { parts: [{ type: "text", text: "..." }] }
   * 响应: { info: {...}, parts: [...] }
   */
  async sendMessage(
    sessionID: string,
    input: MessageInput,
    signal?: AbortSignal,
    model?: { providerID: string; modelID: string },
  ): Promise<SessionMessageResponse> {
    const body: Record<string, unknown> = {
      parts: [{ type: "text" as const, text: input.text }],
      model,
    };
    const url = new URL(`/session/${sessionID}/message`, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: this.makeHeaders(),
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new OpencodeApiError(
        response.status,
        `opencode API error: ${response.status} ${error}`,
      );
    }

    return response.json();
  }

  /** 获取会话上下文（消息历史） */
  async getContext(sessionID: string): Promise<{ data: unknown[] }> {
    return this.request("GET", `/api/session/${sessionID}/context`);
  }

  /** 获取完整消息列表（直接返回 SessionV1.WithParts[] 数组） */
  async getMessages(sessionID: string): Promise<Array<{ info: { role: string; finish?: string }; parts: MessagePart[] }>> {
    return this.request("GET", `/session/${sessionID}/message`);
  }

  /** 异步发送消息（立即返回，agent loop 在后台执行） */
  async promptAsync(
    sessionID: string,
    input: MessageInput,
    model?: { providerID: string; modelID: string },
  ): Promise<void> {
    const url = new URL(`/session/${sessionID}/prompt_async`, this.baseUrl);
    const body = {
      parts: [{ type: "text" as const, text: input.text }],
      model,
    };
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: this.makeHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new OpencodeApiError(response.status, `opencode API error: ${response.status} ${error}`);
    }
  }

  /** 等待 session agent loop 完成 */
  async wait(sessionID: string): Promise<void> {
    await this.request("POST", `/api/session/${sessionID}/wait`);
  }

  /** 订阅实时事件流 */
  async subscribeEvents(directory?: string): Promise<ReadableStream<Uint8Array>> {
    const url = new URL("/event", this.baseUrl);
    if (directory) {
      url.searchParams.set("directory", directory);
    }
    const response = await fetch(url.toString(), {
      headers: this.makeHeaders(),
    });
    if (!response.ok) {
      throw new OpencodeApiError(response.status, `Failed to subscribe to events`);
    }
    return response.body!;
  }

  /** 等待会话完成 */
  async wait(sessionID: string): Promise<void> {
    await this.request("POST", `/api/session/${sessionID}/wait`);
  }

  /** 列出所有会话 */
  async listSessions(params?: {
    limit?: number;
    order?: "asc" | "desc";
    search?: string;
  }): Promise<{ data: SessionInfo[]; cursor: { previous?: string; next?: string } }> {
    const url = new URL("/api/session", this.baseUrl);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    if (params?.order) url.searchParams.set("order", params.order);
    if (params?.search) url.searchParams.set("search", params.search);
    if (this.directory) url.searchParams.set("directory", this.directory);

    const response = await fetch(url.toString(), {
      headers: this.makeHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new OpencodeApiError(
        response.status,
        `opencode API error: ${response.status} ${error}`,
      );
    }

    return response.json();
  }
}

/** 创建客户端 */
export function createOpencodeClient(config: OpencodeClientConfig): OpencodeClient {
  return new OpencodeClient(config);
}
