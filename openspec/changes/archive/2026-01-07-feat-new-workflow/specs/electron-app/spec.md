## ADDED Requirements

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
