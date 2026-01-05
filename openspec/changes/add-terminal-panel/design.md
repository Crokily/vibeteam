## Context
Phase 2 完成了 Orchestrator 集成，IPC 事件流已经建立。现在需要实现 UI 组件来展示任务输出并处理用户交互。

核心挑战：
1. AI Agent CLI 的输出是 TUI（包含 ANSI 转义序列），需要正确渲染
2. 用户需要与 TUI 交互（方向键选择、文本输入）
3. 多任务并行时需要切换不同终端

## Goals / Non-Goals
**Goals:**
- 使用 xterm.js 渲染 TUI 输出
- 实现任务 Tab 切换
- 实现交互输入区域
- 实现交互提醒机制
- 建立主布局框架

**Non-Goals:**
- Workflow DAG 可视化（后续提案）
- 会话历史管理（后续提案）
- 设置页面（后续提案）

## Decisions

### Decision 1: 使用 xterm.js 直接渲染 TUI
- **选择**: 不解析 TUI，直接用 xterm.js 渲染 raw output
- **原因**:
  - AI Agent CLI 的交互式输出本身就是 TUI
  - xterm.js 完美支持 ANSI 转义序列、光标控制、颜色等
  - 用户可以直接在终端中进行方向键选择等操作
- **实现**: 
  ```typescript
  // 监听 taskOutput 事件，写入对应的 Terminal 实例
  terminal.write(payload.raw);  // 使用 raw 而非 cleaned
  ```

### Decision 2: 每个 Task 一个 Terminal 实例
- **选择**: 为每个运行中的 Task 创建独立的 xterm.js Terminal 实例
- **原因**:
  - 保持各任务输出隔离
  - 支持快速切换查看
  - 便于实现键盘事件路由
- **实现**: `Map<string, Terminal>` 存储在 React ref 中

### Decision 3: 键盘事件双向通信
- **选择**: xterm.js `onData` → IPC `task:interact`
- **流程**:
  ```
  用户按键 → xterm.js onData → IPC task:interact(taskId, data)
            → Main Process → orchestrator.submitInteraction()
            → PTY 进程
  ```
- **交互方式**: 用户直接在终端中操作（方向键选择、文本输入、Tab 补全等）
- **无需单独 InputArea**: xterm.js 终端本身就是交互界面
- **注意**: 只对 `executionMode: 'interactive'` 的任务启用键盘输入

### Decision 4: 交互提醒策略
- **触发**: `interactionNeeded` 事件
- **视觉提示**:
  - Tab 上显示指示器（如脉冲动画或红点）
  - Orchestrator 状态显示 `AWAITING_INTERACTION`
- **行为**: 自动切换到需要交互的任务 Tab

### Decision 5: Store 改造 - 存储 raw output
- **问题**: 当前 `appendTaskOutput` 只存储 `cleaned` 文本
- **改造**: 同时存储 `raw` 用于 xterm.js 渲染
- **结构**:
  ```typescript
  taskOutputs: Record<string, { raw: string[]; cleaned: string[] }>
  ```

### Decision 6: 组件结构
```
App.tsx
├── Header (状态栏)
├── MainLayout
│   ├── Sidebar (暂时简化，后续提案扩展)
│   └── ContentArea
│       ├── TerminalTabs
│       │   └── TaskTab[] (含交互提醒指示器)
│       └── TerminalPanel
│           └── XTermTerminal (per task, 支持键盘输入)
```

## Risks / Trade-offs

### Risk 1: xterm.js 内存占用
- **风险**: 长时间运行的任务可能积累大量输出
- **缓解**: 设置 `scrollback` 限制（如 5000 行）

### Risk 2: 键盘焦点管理
- **风险**: 多个 Terminal 实例时焦点可能混乱
- **缓解**: 只有当前激活的 Tab 的 Terminal 接收键盘输入

### Risk 3: 窗口 resize 时 Terminal 尺寸
- **风险**: 窗口大小变化时 Terminal 需要同步调整
- **缓解**: 使用 `@xterm/addon-fit` + ResizeObserver

## Migration Plan
1. 安装 xterm.js 依赖
2. 创建组件目录结构
3. 实现 TerminalPanel 组件
4. 改造 AppStore 存储 raw output
5. 实现主布局和 Tab 切换
6. 实现交互提醒机制

## Open Questions
1. 是否需要支持 Terminal 内容搜索？（可后续添加 SearchAddon）
2. 是否需要复制/粘贴支持？（xterm.js 默认支持）
