## ADDED Requirements
### Requirement: Claude Code Launch Config
The Claude Adapter SHALL provide launch configurations for both interactive and headless modes via the unified interface.

#### Scenario: Interactive Mode for Claude Code
- **WHEN** `getLaunchConfig('interactive', prompt)` is called
- **THEN** the arguments pass the prompt as a positional argument
- **AND** no headless flags are included

#### Scenario: Headless Mode for Claude Code
- **WHEN** `getLaunchConfig('headless', prompt)` is called
- **THEN** the arguments include `-p` and `--dangerously-skip-permissions`
- **AND** the prompt is passed as a positional argument

### Requirement: Claude Code Interaction Patterns
The Claude Adapter SHALL detect idle and confirmation prompts emitted by the Claude Code CLI.

#### Scenario: Idle Prompt Detected
- **WHEN** the CLI outputs the idle prompt `>`
- **THEN** the adapter detects the `interaction_idle` state

#### Scenario: Confirmation Prompt Detected
- **WHEN** the CLI outputs a confirmation menu (for example, "Do you want to create ...?")
- **THEN** the adapter detects the `interaction_handler` state
