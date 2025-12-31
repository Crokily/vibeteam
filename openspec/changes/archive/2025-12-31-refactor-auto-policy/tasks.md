## 1. Foundation (`src/core/automation`)
- [x] 1.1 Create `src/core/automation/types.ts` defining `AutoPolicy`, `InteractionHandler`, and `InteractionContext`.
- [x] 1.2 Create `src/core/automation/StandardHandlers.ts` with common handlers (pressEnter, confirmYes, etc.).

## 2. Adapter Layer (`src/adapters`)
- [x] 2.1 Update `src/adapters/IAgentAdapter.ts` to include optional `autoPolicy?: AutoPolicy`.
- [x] 2.2 Update `src/adapters/GeminiAdapter.ts` to implement `autoPolicy` with `injectArgs: ['--approval-mode', 'yolo']` and a fallback handler.

## 3. Orchestrator Layer (`src/orchestrator`)
- [x] 3.1 Update `Orchestrator.executeTask` to merge `adapter.autoPolicy.injectArgs` into the command when `autoApprove` is true.
- [x] 3.2 Update `Orchestrator.handleInteractionNeeded` to iterate through `adapter.autoPolicy.handlers` when `autoApprove` is true.
- [x] 3.3 Ensure fallback to manual interaction if no handler matches.

## 4. Verification
- [x] 4.1 Add unit tests for `StandardHandlers`.
- [x] 4.2 Add unit tests for `Orchestrator` with mock adapters using different policies.
- [x] 4.3 Verify `GeminiAdapter` behavior with the new policy.
