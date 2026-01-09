# Change: Add Claude Code adapter

## Why
Teams using Claude Code need a first-class adapter so workflows can run through the same unified CLI orchestration.

## What Changes
- Add a Claude adapter with interactive and headless launch configs and unified state patterns
- Register the adapter and expose metadata for UI display
- Add a UI icon mapping for the Claude adapter

## Impact
- Affected specs: adapters
- Affected code: src/adapters, src/index.ts, electron/renderer/src/components/icons
