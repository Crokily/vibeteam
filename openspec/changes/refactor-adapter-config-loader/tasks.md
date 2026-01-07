# Tasks

- [ ] Create `src/adapters/base/AdapterConfigLoader.ts` with the unified logic from current loaders. <!-- id: create-loader -->
- [ ] Refactor `GeminiAdapter` in `src/adapters/gemini/index.ts` to use the new loader. <!-- id: refactor-gemini -->
- [ ] Refactor `CodexAdapter` in `src/adapters/codex/index.ts` to use the new loader. <!-- id: refactor-codex -->
- [ ] Delete `src/adapters/gemini/configLoader.ts`. <!-- id: delete-gemini-loader -->
- [ ] Delete `src/adapters/codex/configLoader.ts`. <!-- id: delete-codex-loader -->
- [ ] Update `openspec/specs/adapters/spec.md` to mention the shared loading mechanism in "Extensible Adapter Architecture". <!-- id: update-spec -->
- [ ] Verify tests still pass (especially `GeminiAdapter.test.ts` and `CodexAdapter.test.ts`). <!-- id: verify-tests -->
