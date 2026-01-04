## Context
Phase 1 完成了 Electron 应用基础框架，包括 IPC 通道定义和 Zustand 状态管理。但 Main Process 的 command handlers 仅返回占位响应，没有真正执行工作流。

本提案将 Vibeteam 核心库的 `Orchestrator` 集成到 Main Process，实现端到端的工作流执行能力。

## Goals / Non-Goals
**Goals:**
- 在 Main Process 实例化并管理 Orchestrator
- 将 Orchestrator 事件转发到 Renderer
- 实现完整的 IPC command handlers
- 确保类型安全的数据转换

**Non-Goals:**
- 实现 UI 组件（后续提案）
- 实现 xterm.js 终端面板（后续提案）
- 修改核心库代码

## Decisions

### Decision 1: Orchestrator 单例模式
- **选择**: 在 Main Process 维护单个 Orchestrator 实例
- **原因**: 
  - 简化状态管理
  - 避免多实例导致的资源竞争
  - 与核心库设计一致（Orchestrator 管理单个工作流）
- **实现**: `electron/main/orchestrator.ts` 导出单例访问函数

### Decision 2: 事件转发策略
- **选择**: 主动监听 + 主动转发
- **实现**:
  ```typescript
  // electron/main/orchestrator.ts
  export function initOrchestrator(mainWindow: BrowserWindow) {
    const orchestrator = new Orchestrator();
    
    orchestrator.on('stateChange', (payload) => {
      mainWindow.webContents.send('orchestrator:stateChange', {
        previous: mapAgentState(payload.from),
        current: mapAgentState(payload.to),
        sessionId: payload.session?.id ?? null,
      });
    });
    
    orchestrator.on('taskOutput', (payload) => {
      mainWindow.webContents.send('orchestrator:taskOutput', {
        taskId: payload.taskId,
        raw: payload.raw,
        cleaned: payload.clean,
        stream: 'stdout',
        timestamp: Date.now(),
      });
    });
    
    // ... 其他事件
  }
  ```

### Decision 3: WorkflowDefinition 类型同步
- **问题**: 核心库的 `WorkflowDefinition` 类型需要在 IPC 层使用
- **选择**: 在 `electron/shared/ipc-types.ts` 中重新定义完整类型
- **原因**: 
  - 避免 Renderer 直接依赖核心库类型
  - 保持 IPC 层的独立性
  - 便于添加 Zod 校验

### Decision 4: 错误处理策略
- **策略**: 
  1. IPC handlers 捕获异常，返回 rejected Promise
  2. Orchestrator 'error' 事件转发为 `orchestrator:error` IPC 事件
  3. Renderer 通过 Zustand store 的 `lastError` 展示错误

### Decision 5: 窗口引用传递
- **问题**: 事件转发需要 `mainWindow.webContents.send()`
- **选择**: 在 Orchestrator 初始化时传入窗口引用
- **实现**: `initOrchestrator(mainWindow: BrowserWindow)`

## Risks / Trade-offs

### Risk 1: 窗口生命周期与 Orchestrator 解耦
- **风险**: 窗口关闭时 Orchestrator 可能仍在运行任务
- **缓解**: 在 `window-all-closed` 事件中调用 `orchestrator.disconnect()`

### Risk 2: 高频事件性能
- **风险**: `taskOutput` 事件可能高频触发，导致 IPC 拥塞
- **缓解**: 
  - 当前阶段不做节流（保持实时性）
  - 后续可根据性能测试添加批量发送机制

## Migration Plan
1. 创建 `electron/main/orchestrator.ts` 模块
2. 修改 `electron/main/index.ts` 初始化 Orchestrator
3. 修改 `electron/main/ipc/handlers.ts` 调用 Orchestrator 方法
4. 扩展 `electron/shared/ipc-types.ts` 类型定义

## Open Questions
1. 是否需要支持多个并发工作流？（当前假设单工作流）
2. 是否需要在 Renderer 暴露更多 Orchestrator 状态（如当前 stageIndex）？
