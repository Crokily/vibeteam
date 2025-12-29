# Design: Workflow Engine & Session Persistence

## Context
The current Orchestrator is too simple for complex flows. We need a system that can run multiple agents (tasks) in parallel for a given stage (e.g., "frontend" and "backend" dev servers), wait for all to complete, and then move to the next stage. We also need to survive process exits.

## Goals
- **Configurable Pipeline**: JSON-defined stages and tasks.
- **Parallel Execution**: Tasks in a stage run via `Promise.all`.
- **Persistence**: Save state on every status change to resume later.
- **Clean UX**: No raw PTY output to stdout; event-based log streaming.

## Decisions
- **State Structure**:
  ```json
  {
    "id": "uuid",
    "currentStageIndex": 0,
    "taskStatus": { "frontend": "DONE", "backend": "RUNNING" },
    "logs": { "frontend": ["line1", "line2"] }
  }
  ```
- **Persistence Strategy**: JSON file system storage. Simple, portable, no DB required yet.
- **Output Handling**: Adapters emit events. Orchestrator aggregates. UI (consumer) decides what to show.
- **Interaction**: Regex matching (PatternLoader) detects prompts. Orchestrator pauses that specific task (conceptually) or marks it as `WAITING_FOR_USER` and notifies UI.

## Risks
- **Concurrency**: Managing multiple PTYs might be resource-heavy.
- **Race Conditions**: Ensuring status updates don't overwrite each other (file writes should be atomic or sequential).
