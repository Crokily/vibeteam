# Change: Refactor execution modes for headless automation

## Why
TUI output noise and implicit idle-based completion make automation brittle. We need deterministic headless execution for automated tasks and explicit user-driven interaction for interactive tasks while keeping CLI capabilities intact.

## What Changes
- Add explicit task execution modes (`headless` | `interactive`) and per-task `prompt` handling.
- Introduce a headless runner (pipe-based) alongside PTY for TUI sessions.
- Extend adapter contract to support headless launch config with positional prompt.
- Update Gemini adapter to use headless yolo with positional prompt arguments.
- Remove auto-approve policies, pending input queues, and idle-driven completion semantics.
- Update tests to match the new execution model.

## Impact
- Affected specs: `core`, `adapters`
- Affected code: `src/orchestrator/*`, `src/core/*`, `src/adapters/*`
