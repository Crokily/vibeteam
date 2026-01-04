## 1. 类型定义扩展
- [x] 1.1 在 `electron/shared/ipc-types.ts` 定义完整的 `WorkflowDefinition` 类型
- [x] 1.2 添加 `WorkflowTask` 和 `WorkflowStage` 类型
- [x] 1.3 在 `electron/shared/ipc-schemas.ts` 添加对应的 Zod schemas

## 2. Orchestrator 模块创建
- [x] 2.1 创建 `electron/main/orchestrator.ts` 模块
- [x] 2.2 实现 Orchestrator 单例管理函数 `getOrchestrator()`
- [x] 2.3 实现初始化函数 `initOrchestrator(mainWindow)`
- [x] 2.4 实现事件监听与 IPC 转发逻辑
- [x] 2.5 实现清理函数 `shutdownOrchestrator()`

## 3. IPC Handlers 实现
- [x] 3.1 实现 `workflow:execute` handler（调用 `orchestrator.executeWorkflow()`）
- [x] 3.2 实现 `workflow:stop` handler（调用 `orchestrator.disconnect()`）
- [x] 3.3 实现 `task:interact` handler（调用 `orchestrator.submitInteraction()`）
- [x] 3.4 实现 `task:complete` handler（调用 `orchestrator.completeTask()`）

## 4. Main Process 集成
- [x] 4.1 修改 `electron/main/index.ts` 在 app ready 时初始化 Orchestrator
- [x] 4.2 修改 `electron/main/index.ts` 在 window-all-closed 时清理 Orchestrator
- [x] 4.3 确保窗口引用正确传递给 Orchestrator 模块

## 5. 测试验证
- [x] 5.1 验证 workflow 执行触发正确的 IPC 事件
- [x] 5.2 验证 task output 事件正确转发到 Renderer
- [x] 5.3 验证 interaction needed 事件正确触发
- [x] 5.4 验证错误事件正确传播
