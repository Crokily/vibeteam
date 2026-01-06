## ADDED Requirements

### Requirement: Session Management UI
The system SHALL provide a UI for viewing history and switching sessions.

#### Scenario: Header Integration
- **WHEN** the application is viewed
- **THEN** the Header component includes a Sessions menu trigger

#### Scenario: List Content
- **WHEN** the Sessions menu is opened
- **THEN** it displays a list of sessions fetched via IPC
- **AND** shows "No sessions found" if empty

### Requirement: Session Data Handling
The system SHALL manage session list data in the application store.

#### Scenario: Refresh List
- **WHEN** the application starts or a workflow finishes
- **THEN** the session list is refreshed via `session:list` IPC
