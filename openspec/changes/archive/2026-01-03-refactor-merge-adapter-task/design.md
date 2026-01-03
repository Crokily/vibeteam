## Context
当前 `WorkflowTask` 需要引用一个 `IAgentAdapter` 实例。Adapter 负责生成启动配置，但同时也持有运行时状态（`state`, `sniffer buffer`）和继承 `EventEmitter`。这导致：
1. 用户必须为每个并行 Task 手动创建独立的 Adapter 实例
2. 误复用 Adapter 会导致难以调试的状态冲突
3. Adapter 的"角色定义"功能（name, cwd）和 Task 的配置（executionMode, prompt）分散在两处

## Goals / Non-Goals
- Goals:
  - 简化用户 API：Task 包含所有必要配置
  - 消除 Adapter 复用风险：每个 Task 执行时自动创建独立实例
  - 保留扩展性：支持多种 Adapter 类型（gemini, claude, codex）
- Non-Goals:
  - 不改变 Adapter 内部实现（state, sniffer, EventEmitter）
  - 不改变工作流执行逻辑（stages, parallel tasks）

## Decisions
### Decision 1: Task 定义包含 Adapter 配置
将原本分散的配置合并到 Task：
```typescript
// Before
const reactAdapter = new GeminiAdapter({ name: 'ReactDev', cwd: './frontend' });
const task = { id: 'task-1', adapter: reactAdapter, prompt: '...' };

// After
const task = {
  id: 'task-1',
  adapter: 'gemini',           // Adapter 类型
  cwd: './frontend',           // 移入 Task
  name: 'ReactDev',            // 可选，默认等于 id
  prompt: '...',
};
```

### Decision 2: Adapter Registry 机制
创建 `AdapterRegistry` 管理 adapter 类型到构造函数的映射：
```typescript
const registry = new AdapterRegistry();
registry.register('gemini', GeminiAdapter);
registry.register('claude', ClaudeAdapter);

// TaskRunner 内部使用
const adapter = registry.create('gemini', { cwd, name, ... });
```

### Decision 3: name 字段默认值
`name` 为可选字段，未指定时默认使用 `id`：
- 用户可指定语义化名称：`{ id: 'task-101', name: 'Senior Architect' }`
- 简化场景直接省略：`{ id: 'architect-task' }` → name 自动为 `'architect-task'`

### Alternatives Considered
1. **Adapter 无状态化**：改动大，需要重构 state/sniffer 到外部
2. **AdapterConfig + 延迟实例化**：增加概念复杂度（config vs instance）

## Risks / Trade-offs
- **Breaking Change**: 现有使用 `adapter: adapterInstance` 的代码需要迁移
  - Mitigation: 提供清晰的迁移指南和示例
- **Registry 默认值**: 需要预注册内置 adapter 类型
  - Mitigation: 在 `src/index.ts` 导出时自动注册

## Migration Plan
1. 新增 `AdapterRegistry` 和 `AdapterType`
2. 修改 `WorkflowTask` 类型定义
3. 更新 `TaskRunner` 使用 registry 创建 adapter
4. 更新所有测试和示例代码
5. 更新 README 文档

## Open Questions
- 是否需要支持用户自定义 adapter 类型注册？（当前方案支持）
