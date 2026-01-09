# Change: Native Directory Selector

## Why
Currently, users must manually type directory paths in the "Base directory" and "Working directory" fields. This is error-prone and tedious. Users expect standard desktop application behavior where they can open a system dialog to select a folder.

## What Changes
1.  **Backend**: Add a new IPC handler `dialog:open-directory` that uses Electron's `dialog.showOpenDialog` to let the user select a folder.
2.  **Frontend**: Update `WorkflowCreatorDialog` to allow users to trigger this dialog for:
    - Base Directory (Workflow level)
    - Working Directory (Agent level)
3.  **UI**: Add a small folder icon or make the input interactive to trigger the selection.

## Risks
- None significantly. Standard Electron capability.
