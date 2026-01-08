## ADDED Requirements
### Requirement: OpenCode Launch Config
The OpenCode Adapter SHALL provide launch configurations for both interactive and headless modes via the unified interface.

#### Scenario: Interactive Mode for OpenCode
- **WHEN** `getLaunchConfig('interactive', prompt)` is called
- **THEN** the arguments include `--prompt` followed by the prompt
- **AND** no `run` subcommand is included

#### Scenario: Headless Mode for OpenCode
- **WHEN** `getLaunchConfig('headless', prompt)` is called
- **THEN** the arguments include `run`
- **AND** the prompt is passed as a positional argument
- **AND** no `--prompt` flag is used

### Requirement: OpenCode Interaction Patterns
The OpenCode Adapter SHALL detect running status and tool permission prompts emitted by the OpenCode CLI.

#### Scenario: Running Indicator Detected
- **WHEN** the CLI outputs the run indicator text `esc interrupt`
- **THEN** the adapter detects the `execution_running` state

#### Scenario: Tool Permission Prompt Detected
- **WHEN** the CLI outputs `Permission required to run this tool:`
- **THEN** the adapter detects the `interaction_handler` state
