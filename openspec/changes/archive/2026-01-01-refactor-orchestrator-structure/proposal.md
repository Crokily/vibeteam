# Change: Refactor Orchestrator Structure

## Why
The `src/orchestrator` directory is currently flat and contains 14+ files, mixing core logic, state management, and minor helper functions. This increases cognitive load and makes the system harder to navigate for new contributors. Grouping related files into subdirectories will improve modularity and maintainability.

## What Changes
- **Directory Grouping**:
    - Move workflow logic to `src/orchestrator/engine/`.
    - Move state and session management to `src/orchestrator/state/`.
- **Logic Consolidation**:
    - Group runner-specific helpers (`runnerPrompt`, `runnerFactory`, etc.) within the `engine/` directory.
- **Barrel Export**: Create `src/orchestrator/index.ts` to provide a clean public API for the rest of the application.

## Impact
- **Affected Specs**: `core` (Structure updates)
- **Affected Code**: All files in `src/orchestrator/`, plus consumers in `src/index.ts` and `test/`.
