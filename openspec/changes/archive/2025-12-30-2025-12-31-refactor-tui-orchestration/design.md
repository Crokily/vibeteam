# Design: TUI Sequential Interaction

## Context
TUI applications (like Gemini, vim, htop) do not exit after performing an action. They return to an "Idle/Ready" state. The current Orchestrator waits for `exit` event to mark a task as DONE, which causes TUI tasks to hang indefinitely.

## Goals
- **Sequential Automation**: Execute a list of commands in order within a single running process.
- **State-Driven Flow**: Use visual state detection (`interaction_idle`) to trigger the next step in the sequence.
- **Hybrid Completion**: Support both "Run & Exit" (traditional CLI) and "Run & Wait" (TUI) task types naturally.

## Decisions
- **`WorkflowTask` Structure**:
  ```typescript
  export type WorkflowTask = {
    // ... existing fields
    pendingInputs: string[]; // Queue of commands to execute
    keepAlive?: boolean;     // If true, do not kill runner on completion
  };
  ```

- **Execution Loop (State Machine)**:
  1. **Start**: Spawn process.
  2. **Wait**: Listen for `stateChange` -> `interaction_idle`.
  3. **Check Queue**:
     - If `pendingInputs` is not empty: `shift()` command -> `runner.send()`.
     - If `pendingInputs` is empty: Mark Task DONE.
  4. **Loop**: Continue monitoring.

- **Completion Handling**:
  - If `keepAlive` is false (default): `runner.stop()` after DONE.
  - If `keepAlive` is true: Leave process running, Orchestrator detaches (or keeps reference but considers task done). *Note: For this iteration, we might just stop monitoring it, but keeping it running requires the Orchestrator to not kill it.*

- **Interaction Handling**:
  - If `interaction_handler` (confirmation/menu) appears: Pause the queue.
  - Emit `interactionNeeded`.
  - User input via `submitInteraction` is sent to runner.
  - Resume loop.

## Risks
- **Pattern Reliability**: If `interaction_idle` regex is flaky, the loop might stall or send commands too early. *Mitigation: Refined regex for Gemini TUI.*
- **Infinite Loops**: If a command fails but leaves the TUI in IDLE state, the system might proceed blindly. *Mitigation: Future work - validate output before next command.*
