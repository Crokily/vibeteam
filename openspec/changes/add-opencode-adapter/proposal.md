# Change: Add OpenCode adapter

## Why
Teams using OpenCode CLI need a first-class adapter so workflows can run through the unified CLI orchestration with accurate launch arguments and state detection.

## What Changes
- Add an OpenCode adapter with interactive and headless launch configs and unified state patterns
- Register the adapter and expose metadata for UI display
- Add a UI icon mapping for the OpenCode adapter

## Impact
- Affected specs: adapters
- Affected code: src/adapters, src/index.ts, electron/renderer/src/components/icons
