## ADDED Requirements

### Requirement: Orchestrator Integration
The system SHALL integrate the Vibeteam core Orchestrator into the Electron main process to enable workflow execution.

#### Scenario: Orchestrator Initialization
- **WHEN** the Electron application starts
- **THEN** an Orchestrator instance is created in the main process
- **AND** event listeners are registered to forward events to the renderer

#### Scenario: Orchestrator Cleanup
- **WHEN** all application windows are closed
- **THEN** the Orchestrator is disconnected
- **AND** any running tasks are stopped gracefully

#### Scenario: Event Forwarding
- **WHEN** the Orchestrator emits an event (stateChange, taskOutput, interactionNeeded, taskStatusChange, error)
- **THEN** the main process sends the corresponding IPC event to the renderer
- **AND** the event payload is transformed to match IPC type definitions

### Requirement: Complete WorkflowDefinition Type
The system SHALL define a complete WorkflowDefinition type in the IPC layer that mirrors the core library structure.

#### Scenario: Type Definition
- **WHEN** a workflow definition is passed via IPC
- **THEN** it includes `id`, `goal`, and `stages` fields
- **AND** each stage contains `id` and `tasks` array
- **AND** each task contains `id`, `adapter`, and optional `executionMode`, `prompt`, `extraArgs`, `cwd`, `env`, `name`

#### Scenario: Runtime Validation
- **WHEN** a workflow definition is received by the main process
- **THEN** it is validated using Zod schema
- **AND** invalid definitions are rejected with a descriptive error

## MODIFIED Requirements

### Requirement: IPC Commands Contract
The system SHALL implement the following IPC commands with real Orchestrator integration.

#### Scenario: Workflow Execution Command
- **WHEN** renderer invokes `electronAPI.workflow.execute(definition)`
- **THEN** main process calls `orchestrator.executeWorkflow(definition)`
- **AND** returns the session ID from the created WorkflowSession
- **AND** Orchestrator events begin flowing to the renderer

#### Scenario: Workflow Stop Command
- **WHEN** renderer invokes `electronAPI.workflow.stop()`
- **THEN** main process calls `orchestrator.disconnect()`
- **AND** any active tasks are stopped
- **AND** Orchestrator state transitions to IDLE

#### Scenario: Task Interaction Command
- **WHEN** renderer invokes `electronAPI.task.interact(taskId, input)`
- **THEN** main process calls `orchestrator.submitInteraction(taskId, input)`
- **AND** the input is sent to the specified task's runner

#### Scenario: Task Completion Command
- **WHEN** renderer invokes `electronAPI.task.complete(taskId)`
- **THEN** main process calls `orchestrator.completeTask(taskId)`
- **AND** the task is marked as DONE and workflow proceeds
