# Change: Merge Adapter Configuration into Task Definition

## Why
当前设计要求用户为每个 Task 创建独立的 Adapter 实例，即使配置相同。这是因为 Adapter 持有运行时状态（`state`, `sniffer buffer`）和 EventEmitter，在并行 Task 中复用会导致状态冲突和事件错乱。这种设计增加了用户使用的复杂度和出错风险。

## What Changes
- **BREAKING**: `WorkflowTask.adapter` 字段从 `IAgentAdapter` 实例改为 `AdapterType` 字符串（如 `'gemini'`）
- **BREAKING**: 原 Adapter 的 `cwd`, `env`, `name` 等配置移入 Task 定义
- Task 新增 `name` 可选字段（显示名称），默认等于 `id`
- 内部执行时为每个 Task 创建独立的 Adapter 实例，解决状态隔离问题
- Adapter 类型注册机制，支持按名称创建 adapter 实例
- 更新 README 和 openspec 文档

## Impact
- Affected specs: `adapters`, `core`
- Affected code:
  - `src/orchestrator/types.ts` (WorkflowTask 类型)
  - `src/orchestrator/engine/TaskRunner.ts` (adapter 实例化逻辑)
  - `src/orchestrator/engine/runnerFactory.ts`
  - `src/adapters/` (registry 机制)
  - `README.md`
  - `test/workflow-demo.ts` (示例更新)
