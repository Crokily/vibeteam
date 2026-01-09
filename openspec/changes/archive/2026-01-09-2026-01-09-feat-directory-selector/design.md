# Design: Native Directory Selector

## IPC Interface
- **Channel**: `dialog:open-directory`
- **Return**: `Promise<string | null>` (The selected path or null if canceled)
- **Implementation**:
  ```typescript
  // main/ipc/handlers.ts
  'dialog:open-directory': async (): Promise<string | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return canceled ? null : filePaths[0];
  }
  ```

## UI Changes
- **Component**: `WorkflowCreatorDialog.tsx`
- **Workflow Base Directory**: Add an `onClick` handler or a secondary button to the input.
- **Agent Working Directory**: Similar treatment for the advanced options inputs.

## Interaction Flow
1. User clicks the input (or a "Browse" button next to it).
2. Renderer calls `ipcClient.dialog.openDirectory()`.
3. Main process opens native picker.
4. User selects a folder.
5. Renderer receives path and updates the state (`setBaseDir` or `setCwd`).
