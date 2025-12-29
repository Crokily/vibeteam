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

