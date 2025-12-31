## ADDED Requirements
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

## MODIFIED Requirements
### Requirement: Agent Adapter Interface
The system SHALL define an `IAgentAdapter` contract to normalize interactions with diverse CLI tools.

#### Scenario: Launch Configuration
- **WHEN** an adapter is queried for launch config
- **THEN** it returns the specific command and arguments (e.g., `['gemini', 'chat']`)

#### Scenario: Automation Policy
- **WHEN** an adapter is inspected
- **THEN** it MAY expose an `autoPolicy` defining how to automate it

### Requirement: Centralized Workflow Management
The system SHALL provide an `Orchestrator` to manage the execution flow of AI agents.

#### Scenario: State Tracking
- **WHEN** an agent is performing work
- **THEN** the Orchestrator reports the state as `RUNNING`
- **WHEN** the agent requests user input
- **THEN** the Orchestrator updates state to `AWAITING_INTERACTION`

#### Scenario: Auto-Approve Argument Injection
- **WHEN** a task is started with `autoApprove: true`
- **AND** the adapter has `injectArgs` in its policy
- **THEN** the Orchestrator appends these arguments to the process launch command
