# Change: Refactor Prompt Injection via CLI Arguments

## Why
当前交互模式使用延迟发送/就绪检测机制来发送初始提示词，但主流AI CLI工具（Claude Code、Gemini CLI、Codex CLI等）都支持通过启动参数直接传递初始提示。这种复杂的延迟机制已不再必要。

统一使用参数注入方式可以：
1. 简化代码，消除复杂的时序逻辑
2. 提高可靠性，避免就绪检测误判
3. 统一交互模式与无头模式的实现逻辑
4. 通过外部JSON配置实现适配器的灵活配置

## What Changes

- **移除延迟发送机制**：删除 `runnerPrompt.ts` 中的超时和就绪检测逻辑
- **统一参数构建**：交互模式和无头模式均通过适配器的参数配置注入初始提示
- **适配器配置外化**：每个适配器的模式参数（如 `-i`、`--yolo`）定义在外部JSON配置中
- **MODIFIED**: `core/spec.md` 的 "Execution Modes" 和 "Interactive Prompt Dispatch" 要求
- **MODIFIED**: `adapters/spec.md` 增加外化模式参数配置的要求

## Impact

- Affected specs: `core`, `adapters`
- Affected code:
  - `src/orchestrator/engine/runnerPrompt.ts` (删除或大幅简化)
  - `src/orchestrator/engine/runnerFactory.ts` (统一launch config逻辑)
  - `src/orchestrator/engine/taskRunnerHandlers.ts` (移除就绪检测相关代码)
  - `src/adapters/base/BaseCLIAdapter.ts` (适配新的参数构建接口)
  - `src/adapters/gemini/index.ts` (重构为统一的模式参数配置)
  - `src/adapters/gemini/args.ts` (扩展为支持多模式)
  - 新增: 适配器模式配置JSON文件
