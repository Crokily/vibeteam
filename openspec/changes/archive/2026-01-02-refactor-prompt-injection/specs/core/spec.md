## MODIFIED Requirements

### Requirement: Agent Adapter Interface
The system SHALL define an `IAgentAdapter` contract to normalize interactions with diverse CLI tools.

#### Scenario: Unified Launch Configuration
- **WHEN** an adapter is queried for launch config
- **THEN** it returns the specific command and arguments via `getLaunchConfig(mode, prompt?, extraArgs?)`
- **AND** the mode parameter determines interactive vs headless argument sets

### Requirement: Execution Modes
The system SHALL allow each workflow task to declare an `executionMode` (`interactive` or `headless`), a `prompt`, and optional `extraArgs` for custom CLI arguments.

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
