## 1. Implementation
- [x] 1.1 Update `WorkflowSession` to support JSON serialization and file persistence logic (`.vibeteam/sessions/`).
- [x] 1.2 Refactor `Orchestrator` to manage `activeRunners` (Map) and implement `executeWorkflow` (Stage-based loop).
- [x] 1.3 Implement "Dashboard Mode" logic: Parallel execution within stages, wait barrier for next stage.
- [x] 1.4 Update `GeminiAdapter` (and base interface) to remove `process.stdout` piping and ensure all output is event-emitted.
- [x] 1.5 Implement `PatternLoader` unit tests for regex matching (critical for interaction detection).
- [x] 1.6 Add input validation in `Orchestrator.submitInteraction()` (throw if not `WAITING_FOR_USER`).
- [x] 1.7 Handle `SIGINT`/`SIGTERM` in `index.ts` or `Orchestrator` to save session before exit.
