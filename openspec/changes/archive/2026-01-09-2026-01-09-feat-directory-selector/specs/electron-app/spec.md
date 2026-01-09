# Electron App Specification

## ADDED Requirements

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
