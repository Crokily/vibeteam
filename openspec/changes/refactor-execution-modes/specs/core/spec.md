## ADDED Requirements
### Requirement: Execution Modes
The system SHALL allow each workflow task to declare an `executionMode` (`interactive` or `headless`) and a `prompt`.

#### Scenario: Headless prompt requirement
- **WHEN** a task is configured with `executionMode: headless` and no prompt
- **THEN** workflow validation fails with an error

### Requirement: Headless Process Management
The system SHALL provide a headless runner that executes the CLI in a pipe-based subprocess (no PTY).

#### Scenario: Headless output capture
- **WHEN** a headless task produces output on stdout or stderr
- **THEN** the runner emits data events with raw and cleaned text
- **AND** the adapter receives the same output callbacks

### Requirement: Interactive Prompt Dispatch
The system SHALL send the initial prompt after the interactive CLI is ready or after a short timeout.

#### Scenario: Ready output gating
- **WHEN** the interactive CLI emits a readiness message (e.g., "Ready for your command")
- **THEN** the system sends the task prompt exactly once
- **AND** records the prompt in session history

## MODIFIED Requirements
### Requirement: Agent Adapter Interface
The system SHALL define an `IAgentAdapter` contract to normalize interactions with diverse CLI tools.

#### Scenario: Launch Configuration
- **WHEN** an adapter is queried for launch config
- **THEN** it returns the specific command and arguments (e.g., `['gemini', 'chat']`)

#### Scenario: Headless Launch Configuration
- **WHEN** an adapter supports headless execution
- **THEN** it MAY expose `getHeadlessLaunchConfig(prompt)` to build arguments for non-PTY execution

## REMOVED Requirements
### Requirement: Auto-Approve Argument Injection
**Reason**: Automation now uses headless execution with explicit yolo args rather than auto-approve injection at runtime.
**Migration**: Use `executionMode: headless` with adapter-provided headless config.

### Requirement: Sequential Interaction for TUI Tasks
**Reason**: Pending input queues and idle-driven completion are removed to avoid brittle TUI state inference.
**Migration**: Use headless execution for automated runs; interactive runs now complete on process exit.

### Requirement: Auto Policy Definition
**Reason**: Adapter-level auto policies are removed.
**Migration**: Model automation as headless tasks with explicit prompts.

### Requirement: Standard Interaction Handlers
**Reason**: Standard handler library is no longer used after removing auto policies.
**Migration**: Handle interactions explicitly in the UI layer.

### Requirement: Policy-Driven Interaction Resolution
**Reason**: Auto-approve interaction handling is removed.
**Migration**: Emit interactions to the user for manual handling.
