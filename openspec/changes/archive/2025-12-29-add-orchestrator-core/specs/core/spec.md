## ADDED Requirements

### Requirement: Centralized Workflow Management
The system SHALL provide an `Orchestrator` to manage the execution flow of AI agents.

#### Scenario: State Tracking
- **WHEN** an agent is performing work
- **THEN** the Orchestrator reports the state as `RUNNING`
- **WHEN** the agent requests user input
- **THEN** the Orchestrator updates state to `AWAITING_INTERACTION`

### Requirement: Session Context
The system SHALL maintain a `WorkflowSession` to preserve the context of the current task.

#### Scenario: Goal Persistence
- **WHEN** a task is started with a specific goal
- **THEN** that goal is stored in the session and accessible throughout the workflow

### Requirement: Event-Driven UI Interface
The Orchestrator SHALL expose events for UI integration.

#### Scenario: UI Notification
- **WHEN** the state changes or interaction is needed
- **THEN** the Orchestrator emits a corresponding event payload
