## MODIFIED Requirements

### Requirement: Session Persistence
The system SHALL persist the session state, including the workflow definition, to the file system.

#### Scenario: Workflow Definition Storage
- **WHEN** a workflow is initialized
- **THEN** the full `WorkflowDefinition` object is stored in the `WorkflowSession`
- **AND** it is persisted to the session JSON file

#### Scenario: Base Directory Configuration
- **WHEN** executing a workflow
- **THEN** the system accepts an optional `baseDir` parameter
- **AND** session files are stored relative to this directory (e.g., `baseDir/.vibeteam/sessions`)

#### Scenario: Base Dir Propagation
- **WHEN** `Orchestrator.executeWorkflow` is called with `baseDir`
- **THEN** the created or loaded `SessionManager` uses this directory for persistence

## ADDED Requirements

### Requirement: Orchestrator Execution Options
The system SHALL allow configuring the storage location for workflow executions.

#### Scenario: Base Dir Propagation
- **WHEN** `Orchestrator.executeWorkflow` is called with `baseDir`
- **THEN** the created or loaded `SessionManager` uses this directory for persistence

### Requirement: Session Management IPC
The system SHALL provide IPC commands to list, load, and resume sessions.

#### Scenario: List Sessions
- **WHEN** `session:list` is invoked
- **THEN** the system returns a list of available sessions from the user data directory
- **AND** each item includes id, goal, status, and startTime
- **AND** the list is sorted by startTime descending

#### Scenario: Load Session (View)
- **WHEN** `session:load` is invoked with an ID
- **THEN** the system reads the session file
- **AND** returns the full session snapshot without starting execution

#### Scenario: Resume Session (Run)
- **WHEN** `session:resume` is invoked with an ID
- **THEN** the system loads the session
- **AND** retrieves the stored workflow definition
- **AND** calls `orchestrator.executeWorkflow` to resume execution

### Requirement: Session List UI
The system SHALL provide a user interface to manage sessions.

#### Scenario: Session Dropdown
- **WHEN** user clicks the Sessions button in the header
- **THEN** a dropdown list of recent sessions is displayed

#### Scenario: Active Session Indicator
- **WHEN** a session is currently loaded or running
- **THEN** it is visually highlighted in the list
