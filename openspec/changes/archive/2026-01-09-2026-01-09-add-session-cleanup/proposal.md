# Change: Automatic Session Cleanup

## Why
Currently, `WorkflowSession` files are persisted indefinitely in the `.vibeteam/sessions` directory. Over time, this can lead to hundreds or thousands of stale JSON files accumulating on the user's disk, consuming space and potentially slowing down session listing operations.

## What Changes
Implement an automatic "pruning" mechanism in `SessionManager`.
1.  **Core Logic**: When a new session is created, the system checks the number of existing session files.
2.  **Threshold**: If the count exceeds a configured limit (`MAX_SESSIONS = 50`), the oldest files (based on modification time) are deleted.
3.  **Integration**: This logic runs automatically within the `SessionManager.create` factory method.

## Risks
- **Data Loss**: Users might rely on very old sessions as a form of long-term history.
- **Performance**: Listing and sorting files on every `create` might add a slight overhead (negligible for < 100 files).