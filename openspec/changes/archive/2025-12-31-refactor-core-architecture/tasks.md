## 1. ESLint Migration
- [x] 1.1 Analyze current `.eslintrc.json` rules.
- [x] 1.2 Create `eslint.config.mjs` using `@eslint/js`, `typescript-eslint`, and `eslint-config-prettier`.
- [x] 1.3 Remove `.eslintrc.json` and `.prettierrc` (if integrated or conflicting).
- [x] 1.4 Update `package.json` scripts if necessary (e.g., remove `--ext` flags).
- [x] 1.5 Run `npm run lint` and fix any new errors exposed by the strict config.

## 2. Orchestrator Refactoring
- [x] 2.1 Extract types to `src/orchestrator/types.ts`.
- [x] 2.2 Create `src/orchestrator/SessionManager.ts` and move file I/O + `WorkflowSession` logic there.
- [x] 2.3 Create `src/orchestrator/WorkflowExecutor.ts` and move stage traversal/task runner logic there.
- [x] 2.4 Refactor `src/orchestrator/Orchestrator.ts` to use `SessionManager` and `WorkflowExecutor`.
- [x] 2.5 Split `src/orchestrator/Orchestrator.test.ts` into `WorkflowExecutor.test.ts` and `SessionManager.test.ts`.

## 3. Adapter Hardening
- [x] 3.1 Update `GeminiAdapter.ts` to accept `patternsPath` in options or resolve relative to `process.cwd()`/root.
- [x] 3.2 Update `GeminiAdapter.test.ts` to use the new path resolution logic.

## 4. Verification
- [x] 4.1 Run full test suite `npm test`.
- [x] 4.2 Run `npm run lint` to ensure cleanliness.
