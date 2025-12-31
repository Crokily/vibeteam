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

### Requirement: Gemini Auto Policy
The Gemini Adapter SHALL provide an automation policy optimized for the tool's capabilities.

#### Scenario: Yolo Mode Injection
- **WHEN** the Gemini Adapter's policy is accessed
- **THEN** it includes `--approval-mode yolo` in `injectArgs`

#### Scenario: Fallback Handler
- **WHEN** the Gemini Adapter's policy is accessed
- **THEN** it includes a runtime handler that presses Enter for any unmatched interactions as a fallback

### Requirement: Robust Path Resolution
Adapters SHALL resolve configuration paths reliably regardless of execution context (source vs bundle).

#### Scenario: Explicit Path Injection
- **WHEN** the adapter is initialized with a specific `patternsPath`
- **THEN** it uses that path to load patterns

#### Scenario: CWD-based Fallback
- **WHEN** no path is provided
- **THEN** it resolves paths relative to the project root/CWD, avoiding fragile `__dirname` references

