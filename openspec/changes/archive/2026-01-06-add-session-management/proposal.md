# Change: Add Session Management

## Why
目前 Electron App 每次执行都是全新的，无法查看历史执行记录，也无法从中断处恢复执行。为了支持长周期的 Agent 任务和历史回溯，需要完善会话管理功能。

同时，Vibeteam Core 目前将 Session 存储在 `process.cwd()`，且不包含 `WorkflowDefinition`，这导致：
1. Electron App 打包后可能无法正确读写 Session
2. 仅凭 Session ID 无法恢复执行（缺少 Workflow 定义）

## What Changes
### Core
- `WorkflowSession` 新增 `workflowDefinition` 字段，持久化存储完整的 Workflow 定义
- `Orchestrator` 支持配置 `baseDir`，并传递给 `SessionManager`

### Electron App
- **IPC**: 新增 `session:list`, `session:load`, `session:resume`, `session:delete`
- **Store**: 增加 `sessions` 列表状态
- **UI**: 
  - Header 增加 "Sessions" 下拉菜单
  - 展示历史会话列表（Goal, ID, Status, Time）
  - 点击加载历史会话（只读模式）或恢复执行

## Impact
- Affected specs: `core`, `electron-app`
- Affected code: 
  - `src/orchestrator/` (Core)
  - `electron/main/` & `electron/renderer/` (App)

## Technical Approach

### Core 增强
1. **Workflow Persistence**: 
   在 `SessionManager.initializeWorkflow` 时，将 `workflow` 对象存入 `session.workflowDefinition`。
   这样 `SessionManager.load()` 就能拿回完整的定义。

2. **Base Dir Configuration**:
   修改 `ExecuteWorkflowOptions`：
   ```typescript
   export type ExecuteWorkflowOptions = {
     sessionId?: string;
     baseDir?: string; // New
   };
   ```
   Orchestrator 将此 `baseDir` 传递给 `SessionManager`。

### Electron 集成
1. **存储位置**: 使用 `app.getPath('userData')/sessions` 作为 `baseDir`。
2. **列表获取**: Main Process 遍历 `baseDir` 下的 JSON 文件，读取摘要信息。
3. **加载/恢复**:
   - **Load (View)**: `SessionManager.load()` -> 返回 Session 数据 -> 前端渲染
   - **Resume (Run)**: `orchestrator.executeWorkflow(session.workflowDefinition, { sessionId })`

### UI 设计
- **Header**: `[Sessions ▼]` 按钮
- **Dropdown**:
  ```
  ┌──────────────────────────────┐
  │  Recent Sessions             │
  ├──────────────────────────────┤
  │  Implement Login             │
  │  2023-10-20 14:30 • DONE     │
  ├──────────────────────────────┤
  │  Refactor Auth               │
  │  2023-10-20 10:15 • ERROR    │
  └──────────────────────────────┘
  ```

## Out of Scope
- 复杂的 Session 过滤/搜索
- 导入/导出 Session 文件
