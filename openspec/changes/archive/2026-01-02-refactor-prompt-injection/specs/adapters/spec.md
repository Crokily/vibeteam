## ADDED Requirements

### Requirement: Unified Adapter Configuration
Adapters SHALL load both state patterns and execution mode parameters from a single external JSON configuration file (`config.json`) to reduce file fragmentation and simplify maintenance.

#### Scenario: Combined Configuration Loading
- **WHEN** an adapter is initialized
- **THEN** it loads state patterns and mode configurations from a single `config.json` file
- **AND** both pattern matching and argument building use this unified source

#### Scenario: Mode-Specific Arguments
- **WHEN** a task requests launch config for `interactive` mode
- **THEN** the adapter loads the `interactive` mode configuration from the `modes` section
- **AND** applies the mode-specific base arguments (e.g., `-i` for Gemini)

#### Scenario: Prompt Position Configuration
- **WHEN** the mode configuration specifies `promptPosition: "last"`
- **THEN** the prompt is appended as the final argument
- **WHEN** the mode configuration specifies `promptPosition: "flag"`
- **THEN** the prompt is passed via a configured flag argument

### Requirement: Unified Launch Config Interface
Adapters SHALL provide a single `getLaunchConfig(mode, prompt?, extraArgs?)` method that handles both interactive and headless execution modes with optional user-defined arguments.

#### Scenario: Interactive Mode Launch
- **WHEN** `getLaunchConfig('interactive', prompt)` is called
- **THEN** it returns arguments configured for interactive PTY execution with the prompt injected

#### Scenario: Headless Mode Launch
- **WHEN** `getLaunchConfig('headless', prompt)` is called
- **THEN** it returns arguments configured for automated execution (e.g., `--approval-mode yolo`) with the prompt injected

#### Scenario: Extra Arguments Injection
- **WHEN** `getLaunchConfig(mode, prompt, extraArgs)` is called with extraArgs
- **THEN** the extraArgs are inserted between mode baseArgs and the prompt
- **AND** the final argument order is: `baseArgs + extraArgs + prompt`

## MODIFIED Requirements

### Requirement: Externalized Pattern Configuration
The system SHALL load CLI interaction rules and execution mode parameters from an external JSON file (`config.json`) to ensure maintainability.

#### Scenario: Configuration Update
- **WHEN** the `config.json` is modified
- **THEN** the adapter behavior changes without requiring a recompile

### Requirement: Robust Path Resolution
Adapters SHALL resolve configuration paths reliably regardless of execution context (source vs bundle).

#### Scenario: Explicit Path Injection
- **WHEN** the adapter is initialized with a specific `configPath`
- **THEN** it uses that path to load the unified configuration

#### Scenario: CWD-based Fallback
- **WHEN** no path is provided
- **THEN** it resolves paths relative to the project root/CWD, avoiding fragile `__dirname` references

### Requirement: Gemini Headless Launch Config
The Gemini Adapter SHALL provide launch configurations for both interactive and headless modes via the unified interface.

#### Scenario: Interactive Mode for Gemini
- **WHEN** the adapter is asked for interactive launch config with a prompt
- **THEN** the arguments include `-i`
- **AND** the prompt is passed as a positional argument

#### Scenario: Headless Mode for Gemini
- **WHEN** the adapter is asked for headless launch config with a prompt
- **THEN** the arguments include `--approval-mode yolo`
- **AND** the prompt is passed as a positional argument
- **AND** no `--prompt` or `-p` flags are used
