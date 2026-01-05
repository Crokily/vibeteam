# Change: Add Terminal Panel UI

## Why
Phase 2 完成了 Orchestrator 集成，事件流已经可以从 Main Process 传递到 Renderer。现在需要实现真正的 UI 来展示任务输出和处理用户交互。本提案实现核心 UI 组件，使用户能够：
- 查看 AI Agent CLI 的实时 TUI 输出
- 切换不同任务的终端面板
- 在需要交互时收到提醒并响应

## What Changes
- 集成 `@xterm/xterm` 和 `@xterm/addon-fit` 用于终端渲染
- 实现主应用布局（侧边栏 + 主内容区）
- 实现终端面板组件（多 Tab + xterm.js 渲染 + 键盘输入路由）
- 实现交互提醒机制（Tab 指示器）
- 实现手动结束任务 UI (Finish 按钮)

## Target Layout
```
┌─────────────────────────────────────────────────────────┐
│  [Sessions ▼]  [+ New]              [Settings] [─][□][×]│
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  Workflow  │   Agent Output Panel                       │
│  Progress  │   ┌────────────────────────────────────┐   │
│            │   │ [ReactDev] [VueDev] [TechLead]    │   │
│  ┌──────┐  │   ├────────────────────────────────────┤   │
│  │Stage1│  │   │                                    │   │
│  │ ├─T1 │  │   │  > Implementing login form...     │   │
│  │ └─T2 │  │   │  > Created LoginForm.tsx          │   │
│  ├──────┤  │   │  > ...                            │   │
│  │Stage2│  │   │  (用户直接在终端内交互)            │   │
│  │ └─T3 │  │   │                                    │   │
│  └──────┘  │   └────────────────────────────────────┘   │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

## Impact
- Affected specs: MODIFIED `electron-app` capability
- Affected code:
  - 新增 `electron/renderer/src/components/` 目录
  - 替换 `electron/renderer/src/App.tsx`
  - 修改 `electron/renderer/src/stores/app-store.ts`（存储 raw output）
- 新增依赖：`@xterm/xterm`, `@xterm/addon-fit`

## Technical Approach

### TUI 渲染策略
- **直接渲染**：使用 xterm.js 原生渲染 AI Agent CLI 的 TUI 输出，不做特殊解析
- **原因**：交互模式的输出本身就是 TUI（包含 ANSI 转义序列），xterm.js 可以完美渲染
- **好处**：保留完整的终端体验，包括颜色、光标、选择菜单等

### 交互模式处理
用户**直接在 xterm.js 终端中操作**，无需单独的输入框：
- **键盘输入**（文本、方向键、回车等）通过 `terminal.onData()` 捕获
- 输入通过 `task:interact` IPC 发送到 Main Process
- Main Process 调用 `orchestrator.submitInteraction()` 写入 PTY 进程
- **好处**：完整保留原生 CLI 交互体验，包括方向键选择、Tab 补全等

### 交互提醒机制
- 当 `interactionNeeded` 事件触发时：
  - 任务 Tab 显示视觉提醒（如脉冲动画/红点）
  - 不自动切换，由用户自行选择任务 Tab 进行交互
  - 用户在终端中直接进行交互操作

## Out of Scope (后续提案)
- Workflow Progress 侧边栏（DAG 可视化）
- Sessions 下拉菜单
- Settings 页面
- 窗口标题栏自定义
