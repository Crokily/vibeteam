# Tasks

- [x] Create `src/adapters/base/AdapterConfigLoader.ts` with the unified logic from current loaders. <!-- id: create-loader -->
- [x] Refactor `GeminiAdapter` in `src/adapters/gemini/index.ts` to use the new loader. <!-- id: refactor-gemini -->
- [x] Refactor `CodexAdapter` in `src/adapters/codex/index.ts` to use the new loader. <!-- id: refactor-codex -->
- [x] Delete `src/adapters/gemini/configLoader.ts`. <!-- id: delete-gemini-loader -->
- [x] Delete `src/adapters/codex/configLoader.ts`. <!-- id: delete-codex-loader -->
- [x] Update `openspec/specs/adapters/spec.md` to mention the shared loading mechanism in "Extensible Adapter Architecture". <!-- id: update-spec -->
- [x] Verify tests still pass (especially `GeminiAdapter.test.ts` and `CodexAdapter.test.ts`). <!-- id: verify-tests -->
