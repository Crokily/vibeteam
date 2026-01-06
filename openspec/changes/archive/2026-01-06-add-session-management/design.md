## Context
为了实现会话恢复和历史查看，必须解决两个核心问题：
1. Session 数据存储在哪里？（Electron 环境下 cwd 不可靠）
2. 恢复执行需要什么数据？（仅有状态是不够的，需要 WorkflowDefinition）

## Goals
- Core 支持持久化 WorkflowDefinition
- Core 支持自定义存储路径
- Electron App 实现会话列表、加载、恢复功能
- Electron App 使用用户数据目录存储 Session

## Decisions

### Decision 1: Core 负责存储 WorkflowDefinition
- **选择**: 修改 `WorkflowSession` 类，增加 `definition` 字段
- **原因**: Session 应当自包含。如果 Definition 丢失，Session 也就失去了恢复执行的上下文。
- **替代方案**: 在 Electron 层另存一份。缺点是增加了应用层复杂度，且 CLI 无法享受此功能。

### Decision 2: 显式传递 BaseDir
- **选择**: `Orchestrator.executeWorkflow` 接受 `baseDir` 参数
- **原因**: 库不应假设运行环境的文件系统布局。Electron 需要存到 `userData`，CLI 存到 `cwd`。

### Decision 3: 两种加载模式
- **View Mode (Load)**: 仅读取 Session 数据用于展示，不启动 Runner。
  - IPC: `session:load(id)`
  - 实现: `SessionManager.load()` -> 返回 Snapshot
- **Run Mode (Resume)**: 加载并继续执行。
  - IPC: `session:resume(id)`
  - 实现: `orchestrator.executeWorkflow(session.definition, { sessionId: id, baseDir })`

### Decision 4: Session 列表性能
- **问题**: 读取所有 JSON 文件可能慢
- **策略**: 
  - `session:list` 只读取文件头或利用 `jq` (不适用) 
  - 实际上 JSON parse 整个文件在数量级不大（<100）时可接受
  - 后续可优化为读取单独的 `index.json` 或 SQLite

## Risks
- **兼容性**: 旧的 Session 文件没有 `workflowDefinition`，加载时需兼容（不可恢复，仅可查看）。
- **文件大小**: 包含 Definition 后 Session 文件变大，但在可接受范围内（文本配置）。

## Migration Plan
1. 修改 Core 代码（WorkflowSession, SessionManager, Orchestrator）
2. 更新 Electron Shared Types
3. 实现 Electron Main Logic
4. 实现 UI 组件
