## MODIFIED Requirements
### Requirement: Centralized Workflow Management
The system SHALL provide a modular orchestration layer to manage the execution flow of AI agents.

#### Scenario: Component Separation
- **WHEN** the system is started
- **THEN** it utilizes distinct components for session persistence (`SessionManager`), execution logic (`WorkflowExecutor`), and public API (`Orchestrator`)

#### Scenario: State Tracking
- **WHEN** an agent is performing work
- **THEN** the Orchestrator reports the state as `RUNNING`
- **WHEN** the agent requests user input
- **THEN** the Orchestrator updates state to `AWAITING_INTERACTION`

#### Scenario: Auto-Approve Argument Injection
- **WHEN** a task is started with `autoApprove: true`
- **AND** the adapter has `injectArgs` in its policy
- **THEN** the Orchestrator appends these arguments to the process launch command
