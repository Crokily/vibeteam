# Change: Refactor Core Architecture & Linting

## Why
The `Orchestrator.ts` file has grown too large (771 lines) and handles too many responsibilities (execution, session management, state tracking), making it hard to maintain and test. Additionally, the project's linting configuration is outdated/broken (ESLint v9 installed but using v8 config), and there are hardcoded paths in adapters that reduce robustness.

## What Changes
- **Refactor Orchestrator**: Split `Orchestrator.ts` into 4 focused files:
    - `types.ts`: Shared type definitions.
    - `SessionManager.ts`: Lifecycle and persistence of workflow sessions.
    - `WorkflowExecutor.ts`: Core logic for traversing stages and running tasks.
    - `Orchestrator.ts`: Facade for high-level events and coordination.
- **Fix ESLint**: Migrate `.eslintrc.json` to `eslint.config.mjs` (Flat Config).
- **Robust Paths**: Update `GeminiAdapter` to use reliable path resolution instead of hardcoded strings or `__dirname` assumptions.
- **Test Separation**: Split `Orchestrator.test.ts` into focused test suites.

## Impact
- **Affected Specs**: 
    - `core`: Internal architecture of orchestration.
    - `adapters`: Path resolution logic.
- **Affected Code**: `src/orchestrator/*`, `src/adapters/GeminiAdapter.ts`, `.eslintrc.json`, `package.json`.
