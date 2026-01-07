# electron-app Specification

## Purpose
Define the Electron desktop application foundation, including structure, IPC contracts, and base UI scaffolding for future orchestration features.
## Requirements
### Requirement: Electron Application Structure
The system SHALL provide an Electron-based desktop application with a clear separation between main process, preload script, and renderer process.

#### Scenario: Project Directory Structure
- **WHEN** a developer inspects the `electron/` directory
- **THEN** they find `main/`, `preload/`, and `renderer/` subdirectories
- **AND** each subdirectory contains TypeScript source files with appropriate configurations

#### Scenario: Development Mode
- **WHEN** `pnpm dev:electron` is executed
- **THEN** the Electron application launches with hot module replacement enabled for the renderer process
- **AND** changes to renderer code are reflected without full restart

#### Scenario: Production Build
- **WHEN** `pnpm build:electron` is executed
- **THEN** the application is compiled and bundled for distribution
- **AND** native modules (node-pty) are correctly linked

### Requirement: Type-Safe IPC Communication
The system SHALL define type-safe inter-process communication channels between main and renderer processes using TypeScript types and Zod runtime validation.

#### Scenario: Command Channel Definition
- **WHEN** IPC commands are defined in `electron/shared/ipc-types.ts`
- **THEN** both main and renderer processes can import and use the same type definitions
- **AND** TypeScript enforces correct argument and return types

#### Scenario: Event Channel Definition
- **WHEN** IPC events are defined for main-to-renderer communication
- **THEN** event payloads are typed
- **AND** renderer can subscribe to events with type-safe callbacks

#### Scenario: Preload Script Exposure
- **WHEN** the renderer process accesses `window.electronAPI`
- **THEN** it receives a typed API object
- **AND** the API methods correspond to defined IPC commands and event subscriptions

### Requirement: IPC Commands Contract
The system SHALL implement the following IPC commands with real Orchestrator integration.

#### Scenario: Workflow Execution Command
- **WHEN** renderer invokes `electronAPI.workflow.execute(definition)`
- **THEN** main process calls `orchestrator.createSession` and executes the workflow
- **AND** returns the `sessionId`

#### Scenario: Workflow Stop Command
- **WHEN** renderer invokes `electronAPI.workflow.stop(sessionId)`
- **THEN** main process routes the request to `orchestrator.removeSession(sessionId)`

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

### Requirement: Configuration Persistence
The system SHALL persist application configuration using electron-store.

#### Scenario: Window State Persistence
- **WHEN** the application window is resized or moved
- **THEN** the position and size are saved
- **WHEN** the application restarts
- **THEN** the window restores to its previous position and size

#### Scenario: Configuration Read/Write via IPC
- **WHEN** renderer invokes `electronAPI.config.get(key)`
- **THEN** main process returns the stored value for that key
- **WHEN** renderer invokes `electronAPI.config.set(key, value)`
- **THEN** main process persists the value

### Requirement: Zustand State Management
The system SHALL use Zustand for renderer process state management with IPC event integration.

#### Scenario: Store Initialization
- **WHEN** the renderer process starts
- **THEN** a Zustand store is created with initial state
- **AND** IPC event listeners are registered to update store state

#### Scenario: State Synchronization
- **WHEN** main process emits an IPC event (e.g., `orchestrator:taskOutput`)
- **THEN** the corresponding Zustand store slice is updated
- **AND** React components subscribed to that state re-render

#### Scenario: Raw Output Storage
- **WHEN** a taskOutput event is received
- **THEN** both raw and cleaned output are stored
- **AND** raw output is used for terminal rendering while cleaned is available for other purposes

### Requirement: Base UI Layout
The system SHALL provide a main layout for the desktop application with terminal-centric design.

#### Scenario: Main Window Structure
- **WHEN** the application launches
- **THEN** a main window is displayed with header, sidebar placeholder, and terminal content area
- **AND** Tailwind CSS styles are applied correctly

#### Scenario: Content Area
- **WHEN** no workflow is active
- **THEN** the main content area displays a welcome/empty state
- **WHEN** a workflow is running
- **THEN** the terminal panel with task tabs is displayed

### Requirement: Orchestrator Integration
The system SHALL integrate the Vibeteam core Orchestrator into the Electron main process to enable workflow execution.

#### Scenario: Orchestrator Initialization
- **WHEN** the Electron application starts
- **THEN** an Orchestrator instance is created in the main process
- **AND** event listeners are registered to forward events to the renderer

#### Scenario: Orchestrator Cleanup
- **WHEN** all application windows are closed
- **THEN** the Orchestrator is disconnected
- **AND** any running tasks are stopped gracefully

#### Scenario: Event Forwarding
- **WHEN** the Orchestrator emits an event (stateChange, taskOutput, interactionNeeded, taskStatusChange, error)
- **THEN** the main process sends the corresponding IPC event to the renderer
- **AND** the event payload is transformed to match IPC type definitions

### Requirement: Complete WorkflowDefinition Type
The system SHALL define a complete WorkflowDefinition type in the IPC layer that mirrors the core library structure.

#### Scenario: Type Definition
- **WHEN** a workflow definition is passed via IPC
- **THEN** it includes `id`, `goal`, and `stages` fields
- **AND** each stage contains `id` and `tasks` array
- **AND** each task contains `id`, `adapter`, and optional `executionMode`, `prompt`, `extraArgs`, `cwd`, `env`, `name`

#### Scenario: Runtime Validation
- **WHEN** a workflow definition is received by the main process
- **THEN** it is validated using Zod schema
- **AND** invalid definitions are rejected with a descriptive error

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

### Requirement: Terminal Panel Component
The system SHALL provide an xterm.js-based terminal panel for rendering AI Agent CLI output with full TUI support.

#### Scenario: TUI Rendering
- **WHEN** a task produces output containing ANSI escape sequences
- **THEN** the terminal panel renders the output with correct colors, cursor positioning, and formatting
- **AND** interactive TUI elements (menus, prompts) are displayed correctly

#### Scenario: Terminal Instance Per Task
- **WHEN** multiple tasks are running
- **THEN** each task has its own terminal instance
- **AND** switching between tasks shows the respective terminal output

#### Scenario: Terminal Resize
- **WHEN** the window or panel is resized
- **THEN** the terminal adjusts to fit the new dimensions
- **AND** the content reflows appropriately

### Requirement: Task Tab Navigation
The system SHALL provide tab-based navigation for switching between task terminals.

#### Scenario: Tab Display
- **WHEN** tasks are running
- **THEN** each task is represented by a tab showing the task name or id
- **AND** the active tab is visually distinguished

#### Scenario: Tab Switching
- **WHEN** user clicks a tab
- **THEN** the corresponding terminal panel becomes visible
- **AND** keyboard focus moves to that terminal

#### Scenario: Interaction Indicator
- **WHEN** a task requires user interaction (status is WAITING_FOR_USER)
- **THEN** the corresponding tab displays a visual indicator (e.g., pulsing dot or highlight)
- **AND** the indicator is removed after interaction is submitted

### Requirement: Keyboard Input Routing
The system SHALL route keyboard input from the terminal to the corresponding task runner.

#### Scenario: Interactive Mode Input
- **WHEN** user types in an interactive mode task's terminal
- **THEN** the keystrokes are sent to the task via `task:interact` IPC
- **AND** the task runner receives the input

#### Scenario: Arrow Key Navigation
- **WHEN** user presses arrow keys in a terminal showing a selection menu
- **THEN** the keys are sent to the task
- **AND** the TUI menu responds accordingly

### Requirement: Interaction Alert System
The system SHALL alert the user when a task requires interaction.

#### Scenario: Visual Alert
- **WHEN** `interactionNeeded` event is received
- **THEN** the corresponding task tab shows a visual indicator (e.g., pulsing animation or badge)
- **AND** the active tab does not change automatically

#### Scenario: Interaction in Terminal
- **WHEN** user needs to interact with a task
- **THEN** they interact directly in the xterm.js terminal (typing, arrow keys, enter, etc.)
- **AND** keystrokes are sent to the task via `task:interact` IPC
- **AND** no separate input area is required

### Requirement: Manual Task Completion
The system SHALL provide a mechanism for users to manually signal that an interactive task is complete.

#### Scenario: Completion Footer
- **WHEN** an interactive task is running or waiting for user
- **THEN** a footer is displayed at the bottom of the terminal panel
- **AND** the footer contains instructions and a "Finish" button

#### Scenario: Finish Action
- **WHEN** user clicks the "Finish" button
- **THEN** the system triggers the task completion logic via `task:complete` IPC
- **AND** the task transitions to DONE state (handled by orchestrator)

### Requirement: Main Application Layout
The system SHALL provide a structured layout with sidebar and main content area.

#### Scenario: Layout Structure
- **WHEN** the application is running
- **THEN** the window displays a header, optional sidebar, and main content area
- **AND** the terminal panel occupies the main content area

#### Scenario: Responsive Layout
- **WHEN** the window is resized
- **THEN** the layout adjusts proportionally
- **AND** the terminal panel resizes to fit

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

