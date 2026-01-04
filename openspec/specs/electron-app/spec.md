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
The system SHALL define the following IPC commands for workflow control.

Note: Orchestrator integration is deferred to a subsequent proposal; handlers may return placeholder responses until wiring is implemented.

#### Scenario: Workflow Execution Command
- **WHEN** renderer invokes `electronAPI.workflow.execute(definition)`
- **THEN** main process handler is invoked with the workflow definition
- **AND** returns a placeholder session ID until orchestrator integration

#### Scenario: Workflow Stop Command
- **WHEN** renderer invokes `electronAPI.workflow.stop()`
- **THEN** main process handler is invoked
- **AND** resolves successfully as a placeholder until orchestrator integration

#### Scenario: Task Interaction Command
- **WHEN** renderer invokes `electronAPI.task.interact(taskId, input)`
- **THEN** main process handler receives the taskId and input
- **AND** resolves successfully as a placeholder until orchestrator integration

#### Scenario: Task Completion Command
- **WHEN** renderer invokes `electronAPI.task.complete(taskId)`
- **THEN** main process handler receives the taskId
- **AND** resolves successfully as a placeholder until orchestrator integration

### Requirement: IPC Events Contract
The system SHALL broadcast the following events from main to renderer:

#### Scenario: State Change Event
- **WHEN** Orchestrator state changes (IDLE, RUNNING, AWAITING_INTERACTION, PAUSED, ERROR)
- **THEN** main process sends `orchestrator:stateChange` event to renderer
- **AND** event payload contains previous state, new state, and session reference

#### Scenario: Task Status Change Event
- **WHEN** a task's status changes (PENDING, RUNNING, WAITING_FOR_USER, DONE, ERROR)
- **THEN** main process sends `orchestrator:taskStatusChange` event to renderer

#### Scenario: Task Output Event
- **WHEN** a task produces output (stdout/stderr)
- **THEN** main process sends `orchestrator:taskOutput` event to renderer
- **AND** event payload contains taskId, raw output, and cleaned output

#### Scenario: Interaction Needed Event
- **WHEN** a task requires user interaction
- **THEN** main process sends `orchestrator:interactionNeeded` event to renderer
- **AND** event payload contains taskId and optional context

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

### Requirement: Base UI Layout
The system SHALL provide a minimal base layout for the desktop application.

#### Scenario: Main Window Structure
- **WHEN** the application launches
- **THEN** a main window is displayed with a basic layout container
- **AND** Tailwind CSS styles are applied correctly

#### Scenario: Content Area Placeholder
- **WHEN** no workflow is active
- **THEN** the main content area displays a placeholder or welcome message

