## 1. Core 增强
- [x] 1.1 修改 `src/orchestrator/types.ts`: `ExecuteWorkflowOptions` 增加 `baseDir`
- [x] 1.2 修改 `src/orchestrator/state/WorkflowSession.ts`: 增加 `workflowDefinition` 字段
- [x] 1.3 修改 `src/orchestrator/state/SessionManager.ts`: 持久化 definition，支持 baseDir 传递
- [x] 1.4 修改 `src/orchestrator/Orchestrator.ts`: 传递 `baseDir` 到 SessionManager

## 2. Electron IPC 扩展
- [x] 2.1 修改 `electron/shared/ipc-types.ts`: 定义 Session 摘要类型，新增 commands
- [x] 2.2 修改 `electron/shared/ipc-schemas.ts`: 新增 schemas
- [x] 2.3 修改 `electron/main/ipc/handlers.ts`: 实现 `session:list`, `load`, `resume`

## 3. Electron Main Logic
- [x] 3.1 确定 `sessionsDir` 路径 (`app.getPath('userData')`)
- [x] 3.2 实现会话列表读取逻辑（按时间倒序）
- [x] 3.3 适配 `workflow:execute` 使用 `sessionsDir`

## 4. Electron UI 实现
- [x] 4.1 修改 `app-store.ts`: 增加 `sessions` 列表
- [x] 4.2 创建 `components/session/SessionList.tsx`: 下拉菜单组件
- [x] 4.3 集成到 `Header.tsx`
- [x] 4.4 实现加载/恢复交互逻辑（点击加载 -> 填充 Store -> 切换视图）

## 5. 验证
- [ ] 5.1 验证新 Session 包含 Definition
- [ ] 5.2 验证历史列表正确展示
- [ ] 5.3 验证 Resume 功能可继续执行
