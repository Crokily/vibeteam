## 1. Implementation
- [x] Add headless execution support via `HeadlessRunner` and route by `executionMode`.
- [x] Extend adapter interface with optional headless launch config.
- [x] Update `GeminiAdapter` to build headless args with positional prompt and yolo mode.
- [x] Replace pending-input/keep-alive logic with prompt-based execution.
- [x] Update orchestration tests to match the new execution model.

## 2. Validation
- [ ] Run unit tests for adapter and executor changes.
- [ ] Run integration scripts as needed.
