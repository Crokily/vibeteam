# electron-app Specification

## ADDED Requirements

### Requirement: Columnar Dashboard Layout
The system SHALL provide a horizontally scrolling dashboard layout to display multiple workflows in parallel columns.

#### Scenario: Horizontal Scrolling
- **WHEN** multiple workflows are active
- **THEN** they are displayed side-by-side as columns
- **AND** the main container allows horizontal scrolling to view off-screen columns

#### Scenario: Column States
- **WHEN** a workflow column is displayed
- **THEN** it can exist in one of three states: Minimized (icon only), Standard (task list), or Expanded (task list + terminal)
- **AND** clicking a task triggers the Expanded state

### Requirement: Global Notification Center
The system SHALL provide a centralized notification area for cross-workflow alerts.

#### Scenario: Status Indicator
- **WHEN** any background workflow requires interaction or encounters an error
- **THEN** a global indicator in the header updates (e.g., increments a counter or changes color)

#### Scenario: Navigation
- **WHEN** the notification indicator is clicked
- **THEN** the dashboard automatically scrolls to the relevant workflow column

### Requirement: Terminal Virtualization
The system SHALL optimize terminal rendering for multiple active sessions.

#### Scenario: Lazy Rendering
- **WHEN** a terminal column is scrolled out of view or minimized
- **THEN** the heavy XTerm rendering is paused or unmounted
- **AND** data is buffered until the terminal becomes visible again

## MODIFIED Requirements

### Requirement: IPC Commands Contract
The system SHALL implement the following IPC commands with real Orchestrator integration.

#### Scenario: Workflow Execution Command
- **WHEN** renderer invokes `electronAPI.workflow.execute(definition)`
- **THEN** main process calls `orchestrator.createSession` and executes the workflow
- **AND** returns the `sessionId`

#### Scenario: Task Interaction Command
- **WHEN** renderer invokes `electronAPI.task.interact(taskId, input, sessionId)`
- **THEN** main process routes the input to the specific session identified by `sessionId`

#### Scenario: Task Completion Command
- **WHEN** renderer invokes `electronAPI.task.complete(taskId, sessionId)`
- **THEN** main process routes the completion signal to the specific session

### Requirement: IPC Events Contract
The system SHALL broadcast the following events from main to renderer:

#### Scenario: Event Attribution
- **WHEN** any Orchestrator event (stateChange, taskOutput, interactionNeeded, etc.) is emitted
- **THEN** the payload SHALL include the `sessionId` of the originating workflow
- **AND** the renderer uses this ID to update the correct column/store slice
