## ADDED Requirements

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

