## Context
Vibeteam 需要一个桌面应用界面来提供更直观的用户体验。选择 Electron 是因为：
1. 项目核心依赖 node-pty（原生模块），需要完整的 Node.js 运行时
2. 需要直接集成现有的 TypeScript 核心库代码
3. AI Agent CLI 的 TUI 输出需要通过 xterm.js 原生渲染

本提案仅涉及基础框架搭建，为后续 UI 功能提供统一的技术基础。

## Goals / Non-Goals
**Goals:**
- 搭建 Electron + Vite + React 开发环境
- 定义类型安全的 IPC 通道契约
- 建立 Main/Renderer 进程通信模式
- 集成基础依赖（Tailwind, Zustand, Zod, electron-store）

**Non-Goals:**
- 实现具体业务 UI 组件
- 集成 Orchestrator 运行时逻辑
- 实现 xterm.js 终端面板
- 应用打包与分发

## Decisions

### Decision 1: 使用 electron-vite 而非手动配置
- **选择**: electron-vite
- **原因**: 
  - 开箱即用的 Electron + Vite 集成
  - 内置 Main/Preload/Renderer 三进程支持
  - 自动处理 Node.js 原生模块（node-pty）
- **替代方案**: vite-plugin-electron（功能较少），手动配置（复杂度高）

### Decision 2: IPC 通道设计模式
采用**双向类型安全**的 IPC 通信模式：

```typescript
// shared/ipc-types.ts - 共享类型定义
export type IpcCommands = {
  'workflow:execute': (workflow: WorkflowDefinition) => Promise<string>;
  'workflow:stop': () => Promise<void>;
  'task:interact': (taskId: string, input: string) => Promise<void>;
  'task:complete': (taskId: string) => Promise<void>;
  'config:get': <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>;
  'config:set': <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>;
};

export type IpcEvents = {
  'orchestrator:stateChange': OrchestratorStateChange;
  'orchestrator:taskStatusChange': OrchestratorTaskStatusChange;
  'orchestrator:taskOutput': OrchestratorTaskOutput;
  'orchestrator:interactionNeeded': OrchestratorInteraction;
  'orchestrator:error': Error;
};
```

- **Commands**: Renderer → Main 的请求/响应模式，使用 `ipcRenderer.invoke` / `ipcMain.handle`
- **Events**: Main → Renderer 的事件推送，使用 `webContents.send` / `ipcRenderer.on`

### Decision 3: Zustand Store 结构
采用**单 Store + Slices 模式**，便于后续扩展：

```typescript
// stores/app-store.ts
interface AppState {
  // Connection
  connected: boolean;
  
  // Orchestrator state (由 IPC events 更新)
  orchestratorState: AgentState;
  session: WorkflowSession | null;
  taskOutputs: Record<string, string[]>;
  pendingInteractions: PendingInteraction[];
  
  // UI state
  activeTaskId: string | null;
  
  // Actions
  // ... (由后续提案定义)
}
```

### Decision 4: 配置持久化范围
使用 electron-store 持久化以下配置：
- 窗口位置/大小
- 默认 Adapter 类型
- 主题偏好（未来）
- 最近打开的工作流

不持久化：运行时状态（由 SessionManager 管理）

## Risks / Trade-offs

### Risk 1: node-pty 原生模块兼容性
- **风险**: electron-builder 打包时可能出现原生模块链接问题
- **缓解**: electron-vite 内置 externals 配置；打包阶段需要 rebuild

### Risk 2: IPC 类型安全的运行时校验开销
- **风险**: Zod 校验可能影响高频事件性能（如 taskOutput）
- **缓解**: 对高频事件采用可选校验模式，仅在开发环境启用

## Migration Plan
1. 新增 `electron/` 目录，不修改现有 `src/` 代码
2. 更新 `package.json`，添加 Electron 相关依赖和脚本
3. 后续提案逐步集成业务功能

## Open Questions
1. 是否需要支持多窗口？（当前假设单窗口）
2. 开发环境是否需要独立的 DevTools 窗口？
