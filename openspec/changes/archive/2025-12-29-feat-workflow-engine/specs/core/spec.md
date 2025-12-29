## ADDED Requirements
### Requirement: Configurable Stage-Based Pipeline
The system SHALL support defining a Workflow as an ordered list of Stages, where each Stage contains one or more Tasks.

#### Scenario: Parallel Task Execution
- **WHEN** a Stage with multiple tasks is executed
- **THEN** the Orchestrator runs all tasks in that Stage in parallel
- **AND** waits for all to complete before moving to the next Stage

### Requirement: Session Persistence
The system SHALL persist the session state to the file system to enable recovery.

#### Scenario: Checkpoint Saving
- **WHEN** the session state changes (e.g., task status update)
- **THEN** the system saves the current state (stage index, task statuses) to a JSON file

#### Scenario: Resume Capability
- **WHEN** the system restarts with an existing session ID
- **THEN** it loads the saved state and resumes from the `currentStageIndex`

### Requirement: Strict Output Isolation
The system SHALL capture all Agent output internally without writing to the main process standard output by default.

#### Scenario: Silent Execution
- **WHEN** a task is running
- **THEN** its PTY output is buffered and emitted as events
- **AND** NO output appears on `process.stdout` unless explicitly handled by the UI consumer

### Requirement: Interaction Detection for Background Tasks
The system SHALL detect interaction requests even for tasks not currently focused.

#### Scenario: Background Prompt
- **WHEN** a hidden agent triggers an interaction pattern
- **THEN** the system updates that task's status to `WAITING_FOR_USER`
- **AND** emits an event to notify the user to attach
