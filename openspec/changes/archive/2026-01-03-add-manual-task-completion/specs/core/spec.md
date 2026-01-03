## MODIFIED Requirements

### Requirement: Task Completion
The system SHALL mark tasks as completed when their process exits OR when manually completed by the user.

#### Scenario: Exit-Based Completion
- **WHEN** a task process exits
- **THEN** the Orchestrator marks the task status as `DONE`

#### Scenario: Manual Completion
- **WHEN** `completeTask(taskId)` is called for an active interactive task
- **THEN** the system stops the task's runner process
- **AND** marks the task status as `DONE`
- **AND** the workflow proceeds to the next stage if all stage tasks are complete

#### Scenario: Invalid Manual Completion
- **WHEN** `completeTask(taskId)` is called for a non-existent or already completed task
- **THEN** the system throws an error
