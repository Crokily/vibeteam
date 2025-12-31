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

#### Scenario: Automation Policy
- **WHEN** an adapter is inspected
- **THEN** it MAY expose an `autoPolicy` defining how to automate it

### Requirement: Output Sanitization
The system SHALL provide utilities to process raw terminal output.

#### Scenario: ANSI Stripping
- **WHEN** raw output containing ANSI colors/cursor codes is received
- **THEN** a clean, text-only version is generated for programmatic analysis

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

### Requirement: Auto Policy Definition
The system SHALL define a structure for automating agent interactions.

#### Scenario: Policy Structure
- **WHEN** an AutoPolicy is defined
- **THEN** it MAY contain `injectArgs` (string array) for process startup
- **AND** it MAY contain `handlers` (function array) for runtime interaction resolution

### Requirement: Standard Interaction Handlers
The system SHALL provide a library of standard interaction handlers.

#### Scenario: Press Enter
- **WHEN** the `pressEnter` handler is used
- **THEN** it returns a carriage return character

### Requirement: Policy-Driven Interaction Resolution
The system SHALL resolve interactions using the adapter's policy when auto-approve is enabled.

#### Scenario: Handler Matching
- **WHEN** an interaction is needed AND `autoApprove` is true
- **AND** a handler in the policy returns a non-null action for the current context
- **THEN** the system executes that action immediately
- **AND** does NOT emit a user interaction event

#### Scenario: No Match Fallback
- **WHEN** no handler matches the current context
- **THEN** the system falls back to manual mode (emits user interaction event)

