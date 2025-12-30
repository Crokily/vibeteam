## ADDED Requirements
### Requirement: Sequential Interaction for TUI Tasks
The Orchestrator SHALL support executing a sequence of commands within a single persistent PTY process for TUI-based tasks.

#### Scenario: Idle-Driven Command Execution
- **WHEN** a task defines a `pendingInputs` queue
- **AND** the agent enters an `interaction_idle` state
- **THEN** the Orchestrator automatically sends the next command from the queue

#### Scenario: TUI Task Completion
- **WHEN** the `pendingInputs` queue is empty
- **AND** the agent is in `interaction_idle` state
- **THEN** the Orchestrator marks the task as `DONE` without requiring the process to exit

#### Scenario: Keep-Alive
- **WHEN** a task is marked `keepAlive: true`
- **THEN** the Orchestrator does NOT terminate the PTY process after task completion