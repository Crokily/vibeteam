# adapters Specification

## Purpose
Standardize interactions with diverse AI CLI tools by providing a unified adapter interface, externalized pattern-based state detection, and non-intrusive output monitoring.
## Requirements
### Requirement: Externalized Pattern Configuration
The system SHALL load CLI interaction rules and execution mode parameters from an external JSON file (`config.json`) to ensure maintainability.

#### Scenario: Configuration Update
- **WHEN** the `config.json` is modified
- **THEN** the adapter behavior changes without requiring a recompile

### Requirement: Non-Intrusive State Monitoring
The system SHALL monitor the CLI session state without interfering with the visual terminal output AND without writing raw output to the parent process stdout.

#### Scenario: Tool Approval Hint
- **WHEN** the underlying CLI outputs a tool confirmation prompt
- **THEN** the system detects this state change via the observer
- **AND** emits an event for the UI
- **AND** prevents the raw prompt from leaking to the main process stdout

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

### Requirement: Robust Path Resolution
Adapters SHALL resolve configuration paths reliably regardless of execution context (source vs bundle).

#### Scenario: Explicit Path Injection
- **WHEN** the adapter is initialized with a specific `configPath`
- **THEN** it uses that path to load the unified configuration

#### Scenario: CWD-based Fallback
- **WHEN** no path is provided
- **THEN** it resolves paths relative to the project root/CWD, avoiding fragile `__dirname` references

### Requirement: Extensible Adapter Architecture
New CLI adapters MUST be implemented by extending a common base class (e.g., `BaseCLIAdapter`) to inherit standard stream handling, buffering, and event management logic. Adapters SHOULD use the shared `AdapterConfigLoader` to ensure consistent configuration parsing and metadata defaults. Adapter types MUST be registered with the `AdapterRegistry` to be usable in workflow tasks.

#### Scenario: Minimal Implementation
- **WHEN** a developer adds a new CLI adapter
- **THEN** they only need to implement command configuration and argument parsing
- **AND** do not need to rewrite buffer management or sniffer logic
- **AND** reuse the shared configuration loader for parsing adapter config files
- **AND** register the adapter type with the registry for workflow integration

### Requirement: Adapter Registry
The system SHALL provide an `AdapterRegistry` to manage adapter type registration and instance creation, enabling dynamic adapter instantiation by type name.

#### Scenario: Register Adapter Type
- **WHEN** `registry.register('gemini', GeminiAdapter)` is called
- **THEN** the adapter type is stored in the registry
- **AND** subsequent `create('gemini', options)` calls return new `GeminiAdapter` instances

#### Scenario: Create Adapter Instance
- **WHEN** `registry.create('gemini', { cwd: './frontend', name: 'ReactDev' })` is called
- **THEN** a new `GeminiAdapter` instance is created with the provided options
- **AND** each call returns a distinct instance (no reuse)

#### Scenario: Unknown Adapter Type
- **WHEN** `registry.create('unknown-type', options)` is called
- **THEN** an error is thrown indicating the adapter type is not registered

### Requirement: Built-in Adapter Registration
The system SHALL pre-register all built-in adapter types (e.g., `gemini`) when the library is imported.

#### Scenario: Default Registry Available
- **WHEN** the user imports from the main entry point
- **THEN** a default registry with built-in adapters is available
- **AND** users can immediately use `'gemini'` as an adapter type in task definitions

### Requirement: Decoupled State Detection
The pattern matching logic (sniffing) SHALL be encapsulated in a reusable component separate from the adapter instance.

#### Scenario: Isolated Sniffer Testing
- **WHEN** testing state detection logic
- **THEN** it can be instantiated and tested with text inputs without creating a full adapter instance

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

### Requirement: Adapter Metadata Configuration
Adapters SHALL include metadata in their configuration file to support UI display.

#### Scenario: Metadata Fields
- **WHEN** an adapter configuration is loaded
- **THEN** the system reads optional `metadata` section containing `displayName` and `icon` fields
- **AND** missing metadata fields default to the adapter type name and a generic icon

#### Scenario: Metadata Schema
- **WHEN** the `metadata` section exists in `config.json`
- **THEN** it SHALL contain:
  - `displayName` (string): Human-readable name for UI display
  - `icon` (string): Icon identifier for frontend icon mapping

### Requirement: Adapter Type Enumeration
The `AdapterRegistry` SHALL provide methods to enumerate registered adapter types and their metadata.

#### Scenario: List Registered Types
- **WHEN** `registry.getRegisteredTypes()` is called
- **THEN** it returns an array of all registered adapter type names

#### Scenario: Get Adapter Metadata
- **WHEN** `registry.getMetadata(type)` is called with a registered type
- **THEN** it returns the metadata object for that adapter
- **AND** includes `displayName`, `icon`, and supported `modes`

#### Scenario: Unknown Type Metadata
- **WHEN** `registry.getMetadata(type)` is called with an unregistered type
- **THEN** it returns `undefined`
