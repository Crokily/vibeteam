# Core Specification

## ADDED Requirements

### Requirement: Session Cleanup
The system SHALL automatically remove old session files to prevent disk clutter.

#### Scenario: Automatic Pruning
- **WHEN** a new `SessionManager` is created (via `SessionManager.create`)
- **THEN** the system checks the total number of session files in the `.vibeteam/sessions` directory
- **IF** the count exceeds the configured `MAX_SESSIONS` (default: 50)
- **THEN** the oldest session files (based on modification time) are permanently deleted until the count is `MAX_SESSIONS - 1` (to accommodate the new one).
