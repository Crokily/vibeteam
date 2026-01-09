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

### Requirement: Adapter List IPC Command
The system SHALL provide an IPC command to retrieve available adapter types and their metadata.

#### Scenario: Fetch Adapter List
- **WHEN** renderer invokes `electronAPI.adapter.list()`
- **THEN** main process returns an array of adapter metadata objects
- **AND** each object includes `type`, `displayName`, `icon`, and `supportedModes`

### Requirement: Workflow Creator Dialog
The system SHALL provide a dialog for creating new workflows with visual agent orchestration.

#### Scenario: Dialog Trigger
- **WHEN** user clicks the "New Workflow" button in the header
- **THEN** a full-screen modal dialog opens for workflow creation

#### Scenario: Dialog Header
- **WHEN** the dialog is open
- **THEN** it displays workflow ID input, base directory selector, and import button
- **AND** workflow ID defaults to an auto-generated UUID

#### Scenario: Dialog Close
- **WHEN** user clicks cancel or presses Escape
- **THEN** the dialog closes without creating a workflow
- **AND** unsaved changes are discarded (with confirmation if changes exist)

### Requirement: Agent Configuration Form
The system SHALL provide a form for configuring individual agents within the workflow creator.

#### Scenario: Basic Configuration
- **WHEN** user clicks "Create Agent"
- **THEN** a form is displayed with:
  - Adapter type selector (dropdown with icons)
  - Prompt input (textarea)
  - Mode selector (interactive/headless with icons)

#### Scenario: Advanced Configuration
- **WHEN** user expands "Advanced Options"
- **THEN** additional fields are shown:
  - Working directory (cwd) - defaults to workflow base directory
  - Environment variables (env) - key-value editor
  - Extra arguments (extraArgs) - comma-separated or array input
  - Agent name (optional display name)

#### Scenario: Form Validation
- **WHEN** user submits an agent configuration
- **THEN** the system validates that adapter type is selected
- **AND** validates that headless mode has a non-empty prompt
- **AND** displays validation errors inline

### Requirement: Visual Workflow Canvas
The system SHALL provide a drag-and-drop canvas for arranging agents into execution order.

#### Scenario: Agent Card Display
- **WHEN** an agent is created
- **THEN** a card is added to the canvas showing:
  - Adapter icon
  - Truncated prompt (with full text in tooltip)
  - Mode icon (play icon for headless, user icon for interactive)
  - Delete button

#### Scenario: Grid Layout
- **WHEN** agents are displayed on the canvas
- **THEN** they are arranged in a grid layout
- **AND** agents in the same row execute in parallel
- **AND** rows execute sequentially from top to bottom

#### Scenario: Drag to Reorder
- **WHEN** user drags an agent card
- **THEN** it can be dropped in a new position within the grid
- **AND** dropping between existing cards inserts at that position
- **AND** dropping at the end of a row appends to that row
- **AND** dropping in an empty row creates a new sequential stage

#### Scenario: Add Row
- **WHEN** user drags a card below the last row
- **THEN** a new row is created for that agent
- **AND** this represents a new sequential stage

### Requirement: Stage Inference Algorithm
The system SHALL automatically infer workflow stages from the visual layout.

#### Scenario: Layout to Definition Conversion
- **WHEN** user clicks "Create Workflow"
- **THEN** the system converts the grid layout to a `WorkflowDefinition`:
  - Each row becomes a `WorkflowStage`
  - Agents in the same row become parallel `tasks` within that stage
  - Stage IDs are auto-generated as `stage-1`, `stage-2`, etc.

#### Scenario: Empty Canvas Validation
- **WHEN** user attempts to create a workflow with no agents
- **THEN** an error is displayed
- **AND** workflow creation is blocked

### Requirement: JSON Import
The system SHALL support importing workflow definitions from JSON.

#### Scenario: Import Button
- **WHEN** user clicks the "Import" button
- **THEN** a file picker or text input modal appears

#### Scenario: Valid JSON Import
- **WHEN** user provides valid `WorkflowDefinition` JSON
- **THEN** the canvas is populated with agents arranged according to stages
- **AND** existing canvas content is replaced (with confirmation)

#### Scenario: Invalid JSON Import
- **WHEN** user provides invalid JSON or schema-mismatched data
- **THEN** an error message is displayed
- **AND** the canvas remains unchanged

### Requirement: Workflow Creation Action
The system SHALL create and execute the workflow when confirmed.

#### Scenario: Create and Execute
- **WHEN** user clicks "Create Workflow" with valid configuration
- **THEN** the dialog closes
- **AND** `workflow:execute` IPC is called with the generated `WorkflowDefinition`
- **AND** a new WorkflowColumn appears in the dashboard

### Requirement: Workflow Template Storage
The system SHALL provide backend storage for workflow templates with CRUD operations.

#### Scenario: Save Workflow Template
- **WHEN** user saves a workflow configuration as template with a name
- **THEN** the system persists the template to `templates/workflows/` directory
- **AND** the template includes the full WorkflowDefinition plus metadata (name, createdAt, updatedAt)

#### Scenario: List Workflow Templates
- **WHEN** user requests the workflow template list
- **THEN** the system returns all saved templates sorted by updatedAt descending
- **AND** each entry includes id, name, and updatedAt

#### Scenario: Delete Workflow Template
- **WHEN** user deletes a workflow template
- **THEN** the template file is removed from storage
- **AND** the template no longer appears in the list

### Requirement: Agent Preset Storage
The system SHALL provide backend storage for agent presets with CRUD operations.

#### Scenario: Save Agent Preset
- **WHEN** user saves an agent configuration as preset with a name
- **THEN** the system persists the preset to `templates/agents/` directory
- **AND** the preset includes adapter, executionMode, prompt, extraArgs, and metadata (name, description, createdAt)

#### Scenario: List Agent Presets
- **WHEN** user requests the agent preset list
- **THEN** the system returns all saved presets sorted by createdAt descending
- **AND** each entry includes id, name, adapter type, and mode

#### Scenario: Delete Agent Preset
- **WHEN** user deletes an agent preset
- **THEN** the preset file is removed from storage
- **AND** the preset no longer appears in the list

### Requirement: Template IPC Commands
The system SHALL provide IPC commands for template operations.

#### Scenario: Workflow Template Commands
- **WHEN** renderer invokes `electronAPI.template.workflow.list()`
- **THEN** main process returns an array of WorkflowTemplateSummary objects

- **WHEN** renderer invokes `electronAPI.template.workflow.save(template)`
- **THEN** main process saves the template and returns the saved template with generated id

- **WHEN** renderer invokes `electronAPI.template.workflow.delete(id)`
- **THEN** main process deletes the template

#### Scenario: Agent Preset Commands
- **WHEN** renderer invokes `electronAPI.template.agent.list()`
- **THEN** main process returns an array of AgentPresetSummary objects

- **WHEN** renderer invokes `electronAPI.template.agent.save(preset)`
- **THEN** main process saves the preset and returns the saved preset with generated id

- **WHEN** renderer invokes `electronAPI.template.agent.delete(id)`
- **THEN** main process deletes the preset

### Requirement: Workflow Template Sidebar
The system SHALL provide a sidebar in the WorkflowCreatorDialog for browsing and applying workflow templates.

#### Scenario: Sidebar Display
- **WHEN** the WorkflowCreatorDialog is open
- **THEN** a sidebar is displayed on the right side showing saved workflow templates
- **AND** each template shows name and last updated time

#### Scenario: Apply Template
- **WHEN** user clicks a template in the sidebar
- **THEN** a confirmation dialog appears if canvas has content
- **WHEN** user confirms
- **THEN** the canvas is replaced with the template's agent configuration

#### Scenario: Save Current as Template
- **WHEN** user clicks "Save as Template" button
- **THEN** a dialog prompts for template name
- **WHEN** user provides a name and confirms
- **THEN** the current canvas configuration is saved as a new template

### Requirement: Agent Preset Bar
The system SHALL provide a bottom bar in the WorkflowCreatorDialog for quick-adding preset agents.

#### Scenario: Preset Bar Display
- **WHEN** the WorkflowCreatorDialog is open
- **THEN** a horizontal bar is displayed below the canvas showing saved agent presets
- **AND** each preset shows adapter icon, name, and mode icon

#### Scenario: Add Preset Agent
- **WHEN** user clicks a preset in the bottom bar
- **THEN** a new agent with the preset configuration is added to the canvas
- **AND** the agent appears in the last row of the canvas

#### Scenario: Save Agent as Preset
- **WHEN** user right-clicks an agent card on the canvas
- **THEN** a context menu appears with "Save as Preset" option
- **WHEN** user selects "Save as Preset"
- **THEN** a dialog prompts for preset name and optional description
- **WHEN** user confirms
- **THEN** the agent configuration is saved as a new preset

### Requirement: Directory Selection
The system SHALL allow users to select directories using the native OS dialog.

#### Scenario: Workflow Base Directory
- **WHEN** user clicks the browse action for "Base directory" in Workflow Creator
- **THEN** a system directory picker dialog opens
- **AND** the selected path is populated into the input field

#### Scenario: Agent Working Directory
- **WHEN** user clicks the browse action for "Working directory" in Agent Advanced Options
- **THEN** a system directory picker dialog opens
- **AND** the selected path is populated into the input field

