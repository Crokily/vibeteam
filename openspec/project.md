# Project Context: Vibeteam

## 项目定位 (Purpose)
Vibeteam 是一个基于 CLI 的 **Node.js AI 工作流编排器 (AI Workflow Orchestrator)**。

它扮演“技术负责人 (Tech Lead)”的角色，管理并协调一系列专业的 AI CLI 工具（如用于需求/QA 的 Gemini CLI 和用于编码的 Codex CLI）。
- **非侵入式集成**：不使用原始 API 调用，而是通过 `node-pty` 包装并控制第三方 CLI 工具，从而完整保留这些工具的内部原生能力（如文件访问、内置 Agent 和工具链）。
- **自动化交付**：自动化 Agent 之间的上下文传递（例如，将 Gemini 批准的需求规范传递给 Codex）。
- **人机协作 (HITL)**：支持 Human-in-the-loop 工作流，允许用户随时“挂载 (attach)”到会话进行人工审查，然后再恢复自动流程。

## 技术栈 (Tech Stack)
- **语言**：TypeScript (Node.js)
- **核心库**：
    - `node-pty`：用于生成伪终端 (Pseudo-terminals)，维持 TTY 上下文/颜色，并处理 AI CLI 的交互式提示。
- **流处理**：原生 Node.js Streams & 文本处理（用于解析 ANSI 输出并检测任务完成状态）。
- **测试架构**：Vitest
- **架构组件**：
    - **Adapters**：标准化不同 CLI（Gemini, Codex, Claude）的交互。
    - **Orchestrator**：管理工作流状态机（Analysis -> Review -> Dev -> QA）。

## 项目规范 (Project Conventions)

### 开发哲学
- **Vibe Coding / 极简主义**：保持代码灵动，避免过度设计。
- **小文件原则**：单个文件保持在 200 行以内。
- **YAGNI**：只解决当前的问题，不为未预见的需求编写代码。
- **水平解耦**：倾向于独立模块，避免深层的继承层次结构。

### 代码风格
- **严格 TypeScript**：启用严格模式，确保类型安全。
- **Linting & Formatting**：ESLint, Prettier。
- **编程范式**：优先使用函数式组合 (Functional Composition)。

### 架构模式
- **适配器模式 (Adapter Pattern)**：用于包装底层的 CLI 进程。
- **事件驱动 (Event-Driven)**：利用 `EventEmitter` 处理 CLI 输出流（data, exit, interaction-needed）。

## 领域上下文 (Domain Context)
- **TTY 交互**：理解 CLI 工具不仅仅是输入输出，还涉及交互式状态和终端转义序列的处理。
- **上下文接力**：工作流的核心价值在于如何将上一个阶段的产物（如 spec）无损且精准地传递给下一个 Agent。

## 重要约束
- 必须确保 `node-pty` 在不同操作系统（尤其是 macOS 和 Linux）下的兼容性。
- 保证用户可以随时接管控制权，系统需具备良好的 attach/detach 机制。