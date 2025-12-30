# Change: Refactor TUI Orchestration

## Why
The current Orchestrator design assumes a "CLI Batch Mode" where a task corresponds to a single process execution that exits upon completion. This is incompatible with Interactive TUI applications (like Gemini CLI) which maintain a persistent session, waiting for user input (IDLE) between operations. To automate these tools, we need to shift from "Process-Life-Cycle" tasks to "Interaction-Sequence" tasks.

## What Changes
- **Task Definition**: `WorkflowTask` will now support a `pendingInputs` queue (array of strings) instead of a single `input`.
- **Orchestrator Logic**:
  - Shifts `executeTask` from waiting for `exit` to waiting for `interaction_idle` state.
  - Implements a command loop: When IDLE, check queue -> Send command -> Wait for Busy -> Wait for IDLE -> Repeat.
  - Task is considered DONE when the `pendingInputs` queue is empty and the agent returns to IDLE state.
- **Process Management**: Adds support for keeping the Agent Runner alive after task completion (configurable via `keepAlive` flag), allowing users to inspect the TUI or continue manually.
- **Adapter Logic**: Updates `GeminiAdapter` patterns to robustly detect the specific TUI Input Box as the `interaction_idle` signal.

## Impact
- **Affected specs**: `core`
- **Affected code**: `src/orchestrator/Orchestrator.ts`, `src/orchestrator/WorkflowSession.ts`, `src/adapters/gemini-patterns.json`
