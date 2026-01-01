# Design: Orchestrator Restructuring

## Overview
The goal is to move from a flat file list in `src/orchestrator` to a categorized folder structure that reflects the internal architecture.

## Proposed Structure

### `src/orchestrator/`
- `Orchestrator.ts`: The main facade.
- `types.ts`: Shared types.
- `index.ts`: Barrel export.

### `src/orchestrator/engine/`
Contains the execution logic and its components.
- `WorkflowExecutor.ts`: High-level workflow state machine.
- `TaskRunner.ts`: Low-level task execution.
- `runnerFactory.ts`, `runnerPrompt.ts`, `runnerUtils.ts`, `taskRunnerHandlers.ts`: Runner helpers.
- `workflowValidation.ts`: Validation logic.

### `src/orchestrator/state/`
Contains persistence and session data models.
- `SessionManager.ts`: Persistence layer.
- `WorkflowSession.ts`: Session data structure.
- `AgentState.ts`: Adapter state wrappers.

## Migration Steps
1. Create `engine/` and `state/` directories.
2. Move files and update internal relative imports.
3. Update `src/index.ts` and `test/` imports.
4. Verify build and tests.
