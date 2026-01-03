## MODIFIED Requirements
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

## ADDED Requirements
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
