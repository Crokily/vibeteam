# core Specification

## Purpose
Provide foundational orchestration primitives—PTY process management, adapter contracts, session context, and output sanitization—for AI CLI workflows.
## Requirements
### Requirement: PTY Process Management
The system SHALL provide an `AgentRunner` capable of managing subprocesses via a pseudo-terminal.

#### Scenario: Lifecycle Management
- **WHEN** the runner is started with a valid adapter
- **THEN** it spawns a shell process
- **AND** maintains a persistent TTY session until stopped

#### Scenario: Bi-directional Communication
- **WHEN** text is sent to the runner
- **THEN** it is written to the subprocess standard input
- **AND** subprocess output is captured and emitted as events

### Requirement: Agent Adapter Interface
The system SHALL define an `IAgentAdapter` contract to normalize interactions with diverse CLI tools.

#### Scenario: Launch Configuration
- **WHEN** an adapter is queried for launch config
- **THEN** it returns the specific command and arguments (e.g., `['gemini', 'chat']`)

### Requirement: Output Sanitization
The system SHALL provide utilities to process raw terminal output.

#### Scenario: ANSI Stripping
- **WHEN** raw output containing ANSI colors/cursor codes is received
- **THEN** a clean, text-only version is generated for programmatic analysis

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
