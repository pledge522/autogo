# 空项目初始化与欢迎页设计

**日期**: 2026-07-15  
**作者**: AI Assistant  
**状态**: 已完成

## 问题描述

之前的实现中，新建项目时会自动创建包含欢迎页面的代码（`src/App.tsx` 等文件）。这导致：
1. Code 标签页显示的是项目模板代码，而不是空白的
2. 欢迎页与项目代码耦合在一起，不够清晰

## 设计方案

### 目标
1. 新创建的项目应该是空的（只包含最小配置文件）
2. 欢迎页应该是系统 UI 的一部分，与项目代码解耦
3. 项目生成内容后，Preview 标签页自动切换到实时预览

### 实现细节

#### 1. 空项目模板 (`lib/sandbox/manager.ts`)

**修改前**：创建完整的模板文件
- `package.json`
- `vite.config.ts`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`（包含欢迎页代码）
- `src/index.css`

**修改后**：只创建最小配置文件
- `package.json`
- `vite.config.ts`

这样新项目在物理上是空的，没有源代码文件。

#### 2. 系统级欢迎页组件 (`components/WelcomeView.tsx`)

新建独立的欢迎页组件，作为系统 UI 的一部分：
- 显示 "Vibe Coding" 标题和欢迎语
- 展示三个核心功能：对话创建、实时预览、自动迭代
- 提示用户在左侧输入框开始对话

#### 3. 智能切换逻辑 (`components/PreviewPanel.tsx`)

添加项目状态检测：
- 每 2 秒轮询 `/api/files?id=xxx` 检查项目是否有文件
- `projectIsEmpty` 状态为 `true` 时，Preview 标签显示欢迎页
- `projectIsEmpty` 状态为 `false` 时，Preview 标签显示 iframe 实时预览

**切换时机**：
- 项目创建时：显示欢迎页
- AI 生成第一个文件后：自动切换到实时预览
- 用户切换 Tab 时：保持用户选择

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `lib/sandbox/manager.ts` | 修改 | `writeProjectTemplate()` 只创建配置文件 |
| `components/WelcomeView.tsx` | 新增 | 系统级欢迎页组件 |
| `components/PreviewPanel.tsx` | 修改 | 添加空项目检测和欢迎页渲染逻辑 |

## 用户体验流程

1. 用户点击"新建项目"
2. 后端创建空项目沙箱（只有 `package.json` 和 `vite.config.ts`）
3. 前端检测到项目为空，Preview 标签显示欢迎页
4. 用户在聊天面板输入需求
5. AI 开始生成代码，项目目录出现新文件
6. 前端检测到项目有内容，Preview 标签自动切换到 iframe 实时预览
7. 用户可以看到 AI 生成的代码效果

## 技术要点

- **轮询检测**：每 2 秒检查一次项目文件状态
- **欢迎页独立**：不依赖项目代码，始终可用
- **无缝切换**：用户无需手动操作，体验流畅

## 后续优化建议

1. 考虑使用 WebSocket 或 Server-Sent Events 替代轮询，更实时
2. 欢迎页可以添加更多引导信息或示例
3. 可以记录用户上次使用的 Tab，会话恢复时保持选择
