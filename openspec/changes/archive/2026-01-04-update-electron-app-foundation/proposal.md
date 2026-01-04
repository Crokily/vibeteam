# Change: Update Electron App Foundation Details

## Why
The Electron foundation needs small adjustments to align the IPC contract with current behavior, support the PAUSED state, and ensure Electron dev/build uses the correct entry point with reliable native module rebuilds. Offline fonts and documentation clarity also improve developer experience.

## What Changes
- Update IPC contract wording and state list (include PAUSED)
- Ensure Electron dev/build/preview uses the correct main entry
- Add electron-builder rebuild configuration and postinstall hook
- Bundle renderer fonts locally and remove network dependency
- Document the pnpm node-linker requirement

## Impact
- Affected specs: electron-app
- Affected code: package.json, electron/shared, electron/renderer, electron-builder.json, README.md
