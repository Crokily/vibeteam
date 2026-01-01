## ADDED Requirements

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
