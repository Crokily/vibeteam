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

#### Scenario: Unified Launch Configuration
- **WHEN** an adapter is queried for launch config
- **THEN** it returns the specific command and arguments via `getLaunchConfig(mode, prompt?, extraArgs?)`
- **AND** the mode parameter determines interactive vs headless argument sets

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
The system SHALL allow each workflow task to declare an `adapter` type (string), `executionMode` (`interactive` or `headless`), a `prompt`, optional `extraArgs` for custom CLI arguments, and optional adapter configuration (`cwd`, `env`, `name`).

#### Scenario: Runner Selection
- **WHEN** a task is `interactive`
- **THEN** the system uses a PTY runner
- **WHEN** a task is `headless`
- **THEN** the system uses the headless runner

#### Scenario: Headless Prompt Requirement
- **WHEN** a task is configured with `executionMode: headless` and no prompt
- **THEN** workflow validation fails with an error

#### Scenario: Unified Prompt Injection
- **WHEN** any task starts with a prompt
- **THEN** the prompt is injected into launch arguments via the adapter's mode configuration
- **AND** the prompt is recorded in session history
- **AND** no stdin-based prompt dispatch occurs

#### Scenario: Extra Arguments Validation
- **WHEN** a task includes `extraArgs`
- **THEN** the system validates that all elements are strings
- **AND** rejects the workflow if validation fails

#### Scenario: Task Adapter Instantiation
- **WHEN** a task is executed
- **THEN** the system creates a new adapter instance using the task's `adapter` type
- **AND** passes task's `cwd`, `env`, and `name` to the adapter constructor
- **AND** each parallel task receives an independent adapter instance

#### Scenario: Task Name Default
- **WHEN** a task does not specify a `name`
- **THEN** the adapter instance uses the task's `id` as its name
- **WHEN** a task specifies a `name`
- **THEN** the adapter instance uses the specified name

### Requirement: Task Definition Structure
The system SHALL define `WorkflowTask` with the following fields: `id` (required), `adapter` (required, string type name), `executionMode` (optional), `prompt` (optional), `extraArgs` (optional), `cwd` (optional), `env` (optional), and `name` (optional display name).

#### Scenario: Minimal Task Definition
- **WHEN** a task is defined with only `id` and `adapter`
- **THEN** the task is valid
- **AND** `executionMode` defaults to `'interactive'`
- **AND** `name` defaults to the value of `id`

#### Scenario: Full Task Definition
- **WHEN** a task is defined with all fields
- **THEN** each field is respected during execution
- **AND** `name` is used as the adapter's display name

### Requirement: Adapter Type Validation
The system SHALL validate that the `adapter` field in each task references a registered adapter type.

#### Scenario: Valid Adapter Type
- **WHEN** a task specifies `adapter: 'gemini'` and `'gemini'` is registered
- **THEN** workflow validation passes

#### Scenario: Invalid Adapter Type
- **WHEN** a task specifies an unregistered adapter type
- **THEN** workflow validation fails with an error indicating the unknown type

### Requirement: Interaction Handling
The system SHALL surface interaction requests to the UI layer.

#### Scenario: Interaction Needed
- **WHEN** an adapter emits an interaction signal
- **THEN** the task status transitions to `WAITING_FOR_USER`
- **AND** the Orchestrator emits an interaction event payload

### Requirement: Task Completion
The system SHALL mark tasks as completed when their process exits OR when manually completed by the user.

#### Scenario: Exit-Based Completion
- **WHEN** a task process exits
- **THEN** the Orchestrator marks the task status as `DONE`

#### Scenario: Manual Completion
- **WHEN** `completeTask(taskId)` is called for an active interactive task
- **THEN** the system stops the task's runner process
- **AND** marks the task status as `DONE`
- **AND** the workflow proceeds to the next stage if all stage tasks are complete

#### Scenario: Invalid Manual Completion
- **WHEN** `completeTask(taskId)` is called for a non-existent or already completed task
- **THEN** the system throws an error

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
