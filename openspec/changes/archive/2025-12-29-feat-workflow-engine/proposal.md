# Change: Feature Workflow Engine

## Why
To support complex, multi-stage agent workflows with robust recovery capabilities, we need to upgrade the core architecture. The current system lacks a formal definition of "stages," parallel execution of tasks within stages, and persistent state management to recover from crashes. Additionally, output management needs to be strict to prevent garbled text during parallel execution.

## What Changes
- **Core Architecture**: Introduces a Stage-Based Pipeline where a Workflow is an ordered list of Stages, and each Stage contains parallel Tasks.
- **Orchestrator Upgrade**: Upgrades Orchestrator to support "Dashboard Mode," managing multiple active runners and executing stages sequentially while tasks run in parallel.
- **Session Persistence**: Implements file-based session persistence (`.vibeteam/sessions/<id>.json`) tracking global stage index and individual task statuses.
- **Output Management**: Enforces strict separation of output. PTY output is buffered and emitted via events, not piped to stdout. Detects `INTERACTION_NEEDED` for "hidden" agents.

## Impact
- **Affected specs**: `core`, `adapters`
- **Affected code**: `src/core/Orchestrator.ts`, `src/core/WorkflowSession.ts`, `src/adapters/GeminiAdapter.ts`
