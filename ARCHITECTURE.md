# autogo + opencode 集成架构

## 概述

本设计文档描述了如何将 opencode 作为 autogo 的编码引擎，实现云端部署友好的架构。

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    autogo (Next.js 应用)                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  React UI    │  │ 聊天界面      │  │ 沙箱预览 (Vite)  │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
│         │                  │                    │            │
│         └──────────────────┼────────────────────┘            │
│                            │                                  │
│                   ┌────────▼────────┐                        │
│                   │  /api/chat SSE  │                        │
│                   │  (流式对话)      │                        │
│                   └────────┬────────┘                        │
│                            │                                  │
│              ┌─────────────▼─────────────┐                   │
│              │  lib/agent/loop-opencode  │                   │
│              │  - 启动 opencode server    │                   │
│              │  - 创建 session           │                   │
│              │  - 订阅事件流             │                   │
│              └─────────────┬─────────────┘                   │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             │ HTTP / SSE
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                  opencode server (子进程)                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Session API                                            │ │
│  │  - POST /api/session/:id/prompt                        │ │
│  │  - GET  /api/session/:id/context                       │ │
│  │  - GET  /api/event (SSE 事件流)                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Tool Registry                                          │ │
│  │  - write_file                                          │ │
│  │  - edit_file                                           │ │
│  │  - bash                                                │ │
│  │  - read_file                                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  LLM Client                                             │ │
│  │  - Claude / GPT / Groq / etc                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. lib/opencode/server.ts

负责启动和管理 opencode server 进程：

- 使用 `spawn("bun", ["run", "packages/cli/src/index.ts", "serve"])` 启动
- 监听 server 启动日志，解析 URL
- 提供 `startOpencodeServer()`、`getGlobalOpencodeServer()`、`closeGlobalOpencodeServer()` API

### 2. lib/opencode/client.ts

轻量级 HTTP 客户端，调用 opencode API：

- `createSession()` - 创建新会话
- `prompt()` - 发送消息
- `getContext()` - 获取会话上下文
- `listSessions()` - 列出所有会话

### 3. lib/agent/loop-opencode.ts

核心 Agent 循环，替代原来的 `lib/agent/loop.ts`：

1. 启动 opencode server（如果未运行）
2. 创建/获取会话
3. 发送用户 prompt
4. 订阅 SSE 事件流 `/api/event`
5. 解析事件并转换为 autogo SSE 格式：
   - `session.message.delta` → `text_delta`
   - `session.tool.started` → `tool_call`
   - `session.file.created/modified` → `file_change`

### 4. app/api/chat/route.ts

Next.js API route，暴露 SSE 接口给前端：

- 调用 `runAgent()` generator
- 使用 `SseSender` 发送事件到前端

## 数据流

```
用户输入
   │
   ▼
前端 ChatInput
   │
   ▼
POST /api/chat { sessionId, message }
   │
   ▼
runAgent(sessionId, message)
   │
   ├─► 启动 opencode server (如果未运行)
   ├─► 创建 session
   ├─► 发送 prompt
   └─► 订阅事件流
         │
         ▼
    opencode SSE /api/event
         │
         ▼
    解析事件 → autogo SSE 格式
         │
         ▼
    前端 EventSource 接收
         │
         ▼
    更新 UI（消息/文件树/预览）
```

## 文件写入流程

opencode 的一个关键优势是**直接写入文件系统**：

1. opencode 的 `write_file` 工具直接在 `projectDir` 下创建/修改文件
2. autogo 沙箱目录就是 `projectDir`（`temp/project-xxx`）
3. Vite dev server 监听到文件变化，自动 HMR
4. 前端 Preview 面板自动刷新

无需额外的文件同步逻辑！

## 云端部署考虑

### 单实例部署

当前架构假设 autogo 和 opencode 运行在同一进程/机器：

- opencode server 作为子进程启动
- 通过 `localhost:4096` 通信
- 文件直接写入本地文件系统

### 多实例/集群部署（未来）

如需横向扩展，可演进为：

1. **独立 opencode 服务**
   - opencode server 作为独立服务部署
   - autogo 通过环境变量配置 opencode URL
   - 使用共享存储（S3/NFS）存储项目文件

2. **会话路由**
   - 根据 sessionId 路由到同一 opencode 实例
   - 或使用集中式数据库存储会话状态

3. **文件同步**
   - opencode 写入共享存储
   - autogo 从共享存储读取文件

## API 参考

### 启动 server

```typescript
import { startOpencodeServer } from "@/lib/opencode/server";

const server = await startOpencodeServer({
  projectDir: "/path/to/project",
  port: 4096,
  timeout: 15000,
});

console.log("Server URL:", server.url);
```

### 创建会话并发送消息

```typescript
import { createOpencodeClient } from "@/lib/opencode/client";

const client = createOpencodeClient({
  baseUrl: "http://127.0.0.1:4096",
  directory: "/path/to/project",
});

// 创建会话
const session = await client.createSession({
  id: "my-session-123",
  location: { directory: "/path/to/project" },
});

// 发送消息
const result = await client.prompt(session.data.id, {
  prompt: "创建一个计数器组件",
});

// 获取上下文
const context = await client.getContext(session.data.id);
console.log(context.data);
```

### 订阅事件流

```typescript
const eventUrl = new URL("/api/event", serverUrl);
eventUrl.searchParams.set("directory", projectDir);

const response = await fetch(eventUrl);
const reader = response.body.getReader();

while (true) {
  const { value } = await reader.read();
  const text = decoder.decode(value);
  
  // 解析 SSE: data: {...}
  for (const line of text.split("\n")) {
    if (line.startsWith("data:")) {
      const event = JSON.parse(line.slice(5));
      console.log("Event:", event.type, event.data);
    }
  }
}
```

## 事件类型映射

| opencode 事件 | autogo SSE 事件 | 说明 |
|--------------|----------------|------|
| `session.message.delta` | `text_delta` | AI 生成的文本流 |
| `session.tool.started` | `tool_call` | 工具调用开始 |
| `session.file.created` | `file_change` (action: create) | 文件创建 |
| `session.file.modified` | `file_change` (action: modify) | 文件修改 |
| `session.completed` | `complete` | 会话完成 |

## 测试

运行测试脚本：

```bash
bun run test-opencode
```

测试流程：
1. 启动 opencode server
2. 创建会话
3. 发送测试消息
4. 验证事件流

## 依赖

无需额外 npm 依赖：
- `lib/opencode/client.ts` 使用原生 `fetch`
- `lib/opencode/server.ts` 使用 `child_process.spawn`
- opencode 源码位于项目子目录 `./opencode/`

## 配置

通过环境变量配置 opencode：

```bash
# opencode 源码目录（默认 ./opencode，也可指向外部）
OPENCODE_DIR=/path/to/opencode

# LLM API 密钥（由 opencode 使用）
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
```

## 更新 OpenCode

```bash
# 更新到最新 main 分支
npm run update-opencode

# 或指定版本
bash scripts/update-opencode.sh 1.17.8
```

更新脚本会从 GitHub 拉取新代码并替换 `opencode/` 目录，同时保留 `node_modules`。

## 下一步

1. **错误处理优化** - 处理 opencode server 崩溃、网络错误
2. **会话持久化** - 将 session 状态保存到数据库
3. **权限控制** - 实现文件访问权限检查
4. **资源限制** - 限制并发 session 数量、CPU/内存使用
