## ADDED Requirements

### Requirement: Modular Orchestrator Structure
The orchestration layer SHALL be organized into functional subdirectories (`engine`, `state`) to maintain clear boundaries between execution logic and persistence.

#### Scenario: Navigating the Codebase
- **WHEN** a developer inspects the `src/orchestrator` directory
- **THEN** they see clearly categorized folders for execution engine and state management
- **AND** the top-level directory contains only the primary facade and public interfaces
