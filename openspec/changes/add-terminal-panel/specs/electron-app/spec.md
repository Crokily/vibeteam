## ADDED Requirements

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

## MODIFIED Requirements

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
