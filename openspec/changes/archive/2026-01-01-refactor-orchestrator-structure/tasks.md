## 1. Preparation
- [x] 1.1 Create `src/orchestrator/engine` and `src/orchestrator/state` directories.

## 2. Moving Files
- [x] 2.1 Move `WorkflowExecutor.ts`, `TaskRunner.ts`, `runnerFactory.ts`, `runnerPrompt.ts`, `runnerUtils.ts`, `taskRunnerHandlers.ts`, `workflowValidation.ts` to `engine/`.
- [x] 2.2 Move `SessionManager.ts`, `WorkflowSession.ts`, `AgentState.ts` to `state/`.
- [x] 2.3 Move associated `.test.ts` files to their respective directories.

## 3. Refactoring Imports
- [x] 3.1 Update relative imports within `src/orchestrator/**/*`.
- [x] 3.2 Create `src/orchestrator/index.ts` barrel file.
- [x] 3.3 Update `src/index.ts` to use new orchestrator paths or barrel.
- [x] 3.4 Update integration tests in `test/` to use new paths.

## 4. Verification
- [x] 4.1 Run `pnpm build` to check for compilation errors.
- [x] 4.2 Run `pnpm test` to ensure all tests pass.
- [x] 4.3 Run integration drivers.
