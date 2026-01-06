# core Specification

## ADDED Requirements

### Requirement: Multi-Session Management
The system SHALL support the concurrent execution and management of multiple workflow sessions.

#### Scenario: Session Creation
- **WHEN** `Orchestrator.createSession` is called
- **THEN** a new `SessionController` is instantiated
- **AND** a unique `sessionId` is returned
- **AND** the session is registered in the Orchestrator's session map

#### Scenario: Session Isolation
- **WHEN** multiple sessions are active
- **THEN** each session maintains its own `WorkflowExecutor`, `SessionManager`, and PTY processes
- **AND** logs and events from one session do not bleed into another

#### Scenario: Session Controller Pattern
- **WHEN** a session is created
- **THEN** a `SessionController` wraps the `SessionManager` and `WorkflowExecutor`
- **AND** provides a unified interface for controlling that specific session

## MODIFIED Requirements

### Requirement: Centralized Workflow Management
The system SHALL provide a modular orchestration layer to manage the execution flow of AI agents.

#### Scenario: Orchestrator as Container
- **WHEN** the `Orchestrator` is initialized
- **THEN** it acts as a container for multiple `SessionController` instances
- **AND** proxies commands and events to/from the appropriate controller based on `sessionId`

### Requirement: Session Management IPC
The system SHALL provide IPC commands to list, load, and resume sessions.

#### Scenario: Resume Session (Run)
- **WHEN** `session:resume` is invoked with an ID
- **THEN** the system loads the session
- **AND** creates a dedicated `SessionController` for it
- **AND** resumes execution within that controller context
