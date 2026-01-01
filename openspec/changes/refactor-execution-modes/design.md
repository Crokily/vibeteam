# Design: Execution Modes

## Overview
The orchestration layer now distinguishes between `interactive` (PTY) and `headless` (pipe-based) executions. Each task declares an `executionMode` and a `prompt` used to start the workflow.

## Execution Flow
- **Interactive**: start a PTY runner and wait for readiness output or a short timeout before sending the initial prompt. This prevents premature `WAITING_FOR_USER` states before the CLI is ready.
- **Headless**: start a pipe-based runner with the prompt injected into the launch args. The prompt is recorded in session history without writing to stdin.

## Interaction Handling
- State changes that include `interaction_idle` trigger initial prompt dispatch if it has not been sent.
- After the initial prompt is sent (or if no prompt exists), interactions are emitted to the user via `interactionNeeded`.

## Completion Semantics
- Tasks are completed on process exit.
- Idle-driven completion and queued command execution are removed.
