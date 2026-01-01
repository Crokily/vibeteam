## 1. Foundation
- [x] 1.1 Create `src/adapters/base/OutputSniffer.ts` to handle pattern matching logic.
- [x] 1.2 Create `src/adapters/base/BaseCLIAdapter.ts` implementing `IAgentAdapter` with generic buffer/event logic.
- [x] 1.3 Add unit tests for `OutputSniffer` and `BaseCLIAdapter`.

## 2. Refactoring
- [x] 2.1 Create `src/adapters/gemini/` directory structure.
- [x] 2.2 Migrate `src/adapters/geminiArgs.ts` and `geminiPatterns.ts` to new folder.
- [x] 2.3 Refactor `GeminiAdapter` to inherit from `BaseCLIAdapter` and place in `src/adapters/gemini/index.ts`.
- [x] 2.4 Verify `GeminiAdapter` contains only configuration and arg parsing logic.

## 3. Integration & Cleanup
- [x] 3.1 Update `src/index.ts`, `src/orchestrator/` imports to point to new paths.
- [x] 3.2 Update tests (`test/`, `src/adapters/GeminiAdapter.test.ts`) to use new paths.
- [x] 3.3 Delete old files in `src/adapters/`.
- [x] 3.4 Run full regression suite.
