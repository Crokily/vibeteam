# core Specification

## Purpose
Provide foundational orchestration primitives for AI CLI workflows, including PTY/headless process management, adapter contracts, session context, and output sanitization.
## Requirements
### Requirement: PTY Process Management
The system SHALL provide an `AgentRunner` capable of managing subprocesses via a pseudo-terminal.

#### Scenario: Lifecycle Management
- **WHEN** the runner is started with a valid adapter
- **THEN** it spawns a PTY-backed process
- **AND** maintains a persistent TTY session until stopped

#### Scenario: Bi-directional Communication
- **WHEN** text is sent to the runner
- **THEN** it is written to the subprocess standard input
- **AND** subprocess output is captured and emitted as events

### Requirement: Headless Process Management
The system SHALL provide a headless runner that executes subprocesses without a PTY.

#### Scenario: Headless Output Capture
- **WHEN** a headless task emits output on stdout or stderr
- **THEN** the runner emits data events containing raw and cleaned text
- **AND** the adapter receives the same output callbacks

#### Scenario: Headless Input
- **WHEN** text is sent to a headless runner
- **THEN** it is written to the subprocess standard input

### Requirement: Agent Adapter Interface
The system SHALL define an `IAgentAdapter` contract to normalize interactions with diverse CLI tools.

#### Scenario: Launch Configuration
- **WHEN** an adapter is queried for launch config
- **THEN** it returns the specific command and arguments (e.g., `['gemini', 'chat']`)

#### Scenario: Headless Launch Configuration
- **WHEN** an adapter supports headless execution
- **THEN** it MAY expose `getHeadlessLaunchConfig(prompt)` to build arguments for non-PTY execution

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

#### Scenario: Stage-Based Pipeline
- **WHEN** a Workflow defines multiple stages
- **THEN** the Orchestrator runs all tasks in the current stage in parallel
- **AND** waits for completion before moving to the next stage

### Requirement: Execution Modes
The system SHALL allow each workflow task to declare an `executionMode` (`interactive` or `headless`) and a `prompt`.

#### Scenario: Runner Selection
- **WHEN** a task is `interactive`
- **THEN** the system uses a PTY runner
- **WHEN** a task is `headless`
- **THEN** the system uses the headless runner

#### Scenario: Headless Prompt Requirement
- **WHEN** a task is configured with `executionMode: headless` and no prompt
- **THEN** workflow validation fails with an error

#### Scenario: Interactive Prompt Dispatch
- **WHEN** an interactive task starts
- **THEN** the system sends the initial prompt once the CLI is ready or after a short timeout
- **AND** records the prompt in session history

### Requirement: Interaction Handling
The system SHALL surface interaction requests to the UI layer.

#### Scenario: Interaction Needed
- **WHEN** an adapter emits an interaction signal
- **THEN** the task status transitions to `WAITING_FOR_USER`
- **AND** the Orchestrator emits an interaction event payload

### Requirement: Task Completion
The system SHALL mark tasks as completed when their process exits.

#### Scenario: Exit-Based Completion
- **WHEN** a task process exits
- **THEN** the Orchestrator marks the task status as `DONE`

### Requirement: Session Context
The system SHALL maintain a `WorkflowSession` to preserve the context of the current workflow.

#### Scenario: Goal Persistence
- **WHEN** a workflow is started with a specific goal
- **THEN** that goal is stored in the session and accessible throughout execution

#### Scenario: History and Logs
- **WHEN** inputs are sent or outputs are received
- **THEN** the session records history and task logs

### Requirement: Session Persistence
The system SHALL persist the session state to the file system to enable recovery.

#### Scenario: Checkpoint Saving
- **WHEN** the session state changes (e.g., task status update)
- **THEN** the system saves the current state (stage index, task statuses) to a JSON file

#### Scenario: Resume Capability
- **WHEN** the system restarts with an existing session ID
- **THEN** it loads the saved state and resumes from the `currentStageIndex`

### Requirement: Strict Output Isolation
The system SHALL capture all agent output internally without writing to the main process standard output by default.

#### Scenario: Silent Execution
- **WHEN** a task is running
- **THEN** its output is buffered and emitted as events
- **AND** NO output appears on `process.stdout` unless explicitly handled by the UI consumer

### Requirement: Modular Orchestrator Structure
The orchestration layer SHALL be organized into functional subdirectories (`engine`, `state`) to maintain clear boundaries between execution logic and persistence.

#### Scenario: Navigating the Codebase
- **WHEN** a developer inspects the `src/orchestrator` directory
- **THEN** they see clearly categorized folders for execution engine and state management
- **AND** the top-level directory contains only the primary facade and public interfaces

