# Tasks: Refactor Prompt Injection

## 1. Adapter Configuration
- [x] 1.1 将 `src/adapters/gemini/patterns.json` 重命名为 `config.json` 并添加 `modes` 配置
- [x] 1.2 更新 `patternLoader.ts` 为 `configLoader.ts`，支持加载统一配置
- [x] 1.3 更新 `IAgentAdapter` 接口，统一为 `getLaunchConfig(mode, prompt?, extraArgs?)`
- [x] 1.4 重构 `BaseCLIAdapter` 实现新的统一接口
- [x] 1.5 更新 `GeminiAdapter` 使用统一的 config.json

## 2. Orchestration Layer
- [x] 2.1 更新 `WorkflowTask` 类型增加 `extraArgs` 字段
- [x] 2.2 简化 `runnerFactory.ts` 的 `resolveLaunchConfig`，使用统一接口
- [x] 2.3 删除 `runnerPrompt.ts` 中的延迟发送/就绪检测代码
- [x] 2.4 更新 `TaskRunner` 移除 `initialPromptTimer` 和相关字段
- [x] 2.5 更新 `taskRunnerHandlers.ts` 移除 `maybeSendInitialPrompt` 调用
- [x] 2.6 简化 `RunnerContext` 类型，移除不再需要的字段

## 3. Tests
- [x] 3.1 更新 `GeminiAdapter.test.ts` 测试新的统一接口
- [x] 3.2 更新 `TaskRunner` 相关测试
- [x] 3.3 验证测试套件通过

## 4. Cleanup
- [x] 4.1 删除旧的 `patternLoader.ts` 和 `args.ts`
- [x] 4.2 更新类型定义和测试
