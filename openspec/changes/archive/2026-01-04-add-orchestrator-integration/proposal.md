# Change: Add Orchestrator Integration

## Why
Phase 1 建立了 Electron 应用的基础框架，但 IPC handlers 仅返回占位响应。本提案将 Vibeteam 核心库的 `Orchestrator` 集成到 Main Process，实现真正的工作流执行能力，使 Electron 应用具备完整的 AI Agent 编排功能。

## What Changes
- 在 Main Process 创建并管理 `Orchestrator` 单例
- 将 `Orchestrator` 事件（stateChange, taskOutput, interactionNeeded 等）转发到 Renderer
- 实现真正的 IPC command handlers：
  - `workflow:execute` → 调用 `orchestrator.executeWorkflow()`
  - `workflow:stop` → 调用 `orchestrator.disconnect()`
  - `task:interact` → 调用 `orchestrator.submitInteraction()`
  - `task:complete` → 调用 `orchestrator.completeTask()`
- 扩展 IPC 类型定义以支持完整的 `WorkflowDefinition` 类型

## Impact
- Affected specs: MODIFIED `electron-app` capability
- Affected code:
  - `electron/main/ipc/handlers.ts` - 实现真正的逻辑
  - `electron/main/orchestrator.ts` - 新增 Orchestrator 管理模块
  - `electron/shared/ipc-types.ts` - 扩展类型定义
- 不影响 `src/` 核心库代码

## Technical Approach

### Orchestrator 生命周期管理
```
App Start → Create Orchestrator Instance
         ↓
    Register Event Listeners → Forward to Renderer via webContents.send
         ↓
    Wait for IPC Commands
         ↓
App Close → orchestrator.disconnect() → Cleanup
```

### 事件转发机制
Main Process 监听 Orchestrator 事件并转发：
```typescript
orchestrator.on('stateChange', (payload) => {
  mainWindow.webContents.send('orchestrator:stateChange', mapToIpcPayload(payload));
});
```

### 类型映射
核心库类型与 IPC 类型的映射：
- `AgentState` → `OrchestratorState`
- `WorkflowSession` → session ID (简化)
- `TaskStatus` (core) → `TaskStatus` (ipc)
