## MODIFIED Requirements

### Requirement: IPC Commands Contract
The system SHALL define the following IPC commands for workflow control.

Note: Orchestrator integration is deferred to a subsequent proposal; handlers may return placeholder responses until wiring is implemented.

#### Scenario: Workflow Execution Command
- **WHEN** renderer invokes `electronAPI.workflow.execute(definition)`
- **THEN** main process handler is invoked with the workflow definition
- **AND** returns a placeholder session ID until orchestrator integration

#### Scenario: Workflow Stop Command
- **WHEN** renderer invokes `electronAPI.workflow.stop()`
- **THEN** main process handler is invoked
- **AND** resolves successfully as a placeholder until orchestrator integration

#### Scenario: Task Interaction Command
- **WHEN** renderer invokes `electronAPI.task.interact(taskId, input)`
- **THEN** main process handler receives the taskId and input
- **AND** resolves successfully as a placeholder until orchestrator integration

#### Scenario: Task Completion Command
- **WHEN** renderer invokes `electronAPI.task.complete(taskId)`
- **THEN** main process handler receives the taskId
- **AND** resolves successfully as a placeholder until orchestrator integration

### Requirement: IPC Events Contract
The system SHALL broadcast the following events from main to renderer:

#### Scenario: State Change Event
- **WHEN** Orchestrator state changes (IDLE, RUNNING, AWAITING_INTERACTION, PAUSED, ERROR)
- **THEN** main process sends `orchestrator:stateChange` event to renderer
- **AND** event payload contains previous state, new state, and session reference

#### Scenario: Task Status Change Event
- **WHEN** a task's status changes (PENDING, RUNNING, WAITING_FOR_USER, DONE, ERROR)
- **THEN** main process sends `orchestrator:taskStatusChange` event to renderer

#### Scenario: Task Output Event
- **WHEN** a task produces output (stdout/stderr)
- **THEN** main process sends `orchestrator:taskOutput` event to renderer
- **AND** event payload contains taskId, raw output, and cleaned output

#### Scenario: Interaction Needed Event
- **WHEN** a task requires user interaction
- **THEN** main process sends `orchestrator:interactionNeeded` event to renderer
- **AND** event payload contains taskId and optional context
