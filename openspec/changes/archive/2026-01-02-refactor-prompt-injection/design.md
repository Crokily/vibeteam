# Design: Unified Prompt Injection

## Context
当前系统对交互模式和无头模式采用不同的初始提示处理方式：
- **无头模式**: 通过 `getHeadlessLaunchConfig(prompt)` 将提示注入启动参数
- **交互模式**: 启动PTY后，等待CLI就绪（检测输出或1.5秒超时）再发送提示

这种差异导致了复杂的时序逻辑和维护负担。主流AI CLI都支持参数化提示注入：
- Gemini CLI: `gemini -i "prompt"` (交互) / `gemini --approval-mode yolo "prompt"` (自动)
- Codex CLI: `codex "prompt"` (交互) / `codex --auto "prompt"` (自动)
- Claude Code: 类似机制

## Goals / Non-Goals
**Goals:**
- 统一交互/无头模式的提示注入为参数方式
- 通过外部JSON配置实现适配器模式参数的灵活定义
- 删除延迟发送/就绪检测的复杂逻辑
- 保持向后兼容的工作流API

**Non-Goals:**
- 不改变PTY/管道运行器的核心差异
- 不改变工作流定义的DSL格式
- 不增加运行时依赖

## Decisions

### Decision 1: 统一适配器配置文件
将现有的 `patterns.json` 与模式配置合并为单一的 `config.json`：

```json
// src/adapters/gemini/config.json
{
  "states": {
    "interaction_idle": {
      "pattern": "(│\\s*>\\s*Type your message|Type your message)",
      "description": "Gemini TUI input box is visible"
    },
    "interaction_handler": {
      "pattern": "(Allow execution of:|Apply this change\\?)",
      "flags": "i",
      "description": "Gemini CLI execution confirmation menu"
    }
  },
  "modes": {
    "interactive": {
      "baseArgs": ["-i"],
      "promptPosition": "last"
    },
    "headless": {
      "baseArgs": ["--approval-mode", "yolo"],
      "promptPosition": "last"
    }
  }
}
```

**Rationale**: 单一配置文件便于维护，减少文件碎片化。

### Decision 2: 用户自定义参数支持
在 `WorkflowTask` 中增加 `extraArgs` 字段，允许用户在任务级别传递自定义参数：

```typescript
type WorkflowTask = {
  id: string;
  adapter: IAgentAdapter;
  executionMode?: ExecutionMode;
  prompt?: string;
  extraArgs?: string[];  // 新增
};
```

参数组装顺序：`modeConfig.baseArgs + task.extraArgs + prompt`

**Rationale**: 用户可能需要传递会话级别的特殊参数（如 `--model gpt-4`），而不污染适配器的默认配置。

### Decision 3: 统一的 getLaunchConfig 接口
适配器提供单一的 `getLaunchConfig(mode, prompt?, extraArgs?)` 方法：

```typescript
interface IAgentAdapter {
  getLaunchConfig(mode: ExecutionMode, prompt?: string, extraArgs?: string[]): AgentLaunchConfig;
}
```

**Rationale**: 简化接口，同时支持运行时参数扩展。

### Decision 4: 移除 runnerPrompt.ts 的时序逻辑
删除以下功能：
- `INITIAL_PROMPT_TIMEOUT_MS` 超时机制
- `READY_OUTPUT_PATTERNS` 就绪检测
- `maybeSendInitialPrompt` 及相关调用

**Rationale**: 参数注入后，CLI启动即收到提示，无需延迟发送。

### Decision 5: promptInLaunch 始终为 true
所有执行模式下，提示都通过启动参数传递：
- 适配器根据 `executionMode` 选择对应的模式配置
- 提示按 `promptPosition` 规则插入参数列表
- SessionManager 记录提示到历史（无需stdin写入）

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 某些CLI不支持参数化提示 | 模式配置可定义 `promptPosition: "stdin"` 作为回退 |
| 现有工作流依赖延迟发送 | 渐进迁移，先验证主流CLI都支持参数方式 |

## Migration Plan
1. 为Gemini、Codex、Claude创建modes.json配置
2. 重构BaseCLIAdapter支持新接口
3. 更新TaskRunner使用统一的launchConfig获取
4. 删除runnerPrompt.ts中的延迟逻辑
5. 更新测试用例
6. 更新workflow-demo.ts示例

## Open Questions
- 是否需要支持 `promptPosition: "stdin"` 作为极端情况的回退？（建议暂不实现，YAGNI）
