# adapters Specification

## Purpose
Standardize interactions with diverse AI CLI tools by providing a unified adapter interface, externalized pattern-based state detection, and non-intrusive output monitoring.
## Requirements
### Requirement: Externalized Pattern Configuration
The system SHALL load CLI interaction rules from an external JSON file to ensure maintainability.

#### Scenario: Pattern Update
- **WHEN** the `gemini-patterns.json` is modified
- **THEN** the adapter behavior changes without requiring a recompile

### Requirement: Non-Intrusive State Monitoring
The system SHALL monitor the CLI session state without interfering with the visual terminal output AND without writing raw output to the parent process stdout.

#### Scenario: Tool Approval Hint
- **WHEN** the underlying CLI outputs a tool confirmation prompt
- **THEN** the system detects this state change via the observer
- **AND** emits an event for the UI
- **AND** prevents the raw prompt from leaking to the main process stdout

### Requirement: Gemini Headless Launch Config
The Gemini Adapter SHALL provide a headless launch configuration that runs in yolo mode and accepts a positional prompt.

#### Scenario: Positional Prompt for Headless Mode
- **WHEN** the adapter is asked for a headless launch config with a prompt
- **THEN** the arguments include `--approval-mode yolo`
- **AND** the prompt is passed as a positional argument
- **AND** no `--prompt` or `-p` flags are used

### Requirement: Robust Path Resolution
Adapters SHALL resolve configuration paths reliably regardless of execution context (source vs bundle).

#### Scenario: Explicit Path Injection
- **WHEN** the adapter is initialized with a specific `patternsPath`
- **THEN** it uses that path to load patterns

#### Scenario: CWD-based Fallback
- **WHEN** no path is provided
- **THEN** it resolves paths relative to the project root/CWD, avoiding fragile `__dirname` references

### Requirement: Extensible Adapter Architecture
New CLI adapters MUST be implemented by extending a common base class (e.g., `BaseCLIAdapter`) to inherit standard stream handling, buffering, and event management logic.

#### Scenario: Minimal Implementation
- **WHEN** a developer adds a new CLI adapter
- **THEN** they only need to implement command configuration and argument parsing
- **AND** do not need to rewrite buffer management or sniffer logic

### Requirement: Decoupled State Detection
The pattern matching logic (sniffing) SHALL be encapsulated in a reusable component separate from the adapter instance.

#### Scenario: Isolated Sniffer Testing
- **WHEN** testing state detection logic
- **THEN** it can be instantiated and tested with text inputs without creating a full adapter instance

