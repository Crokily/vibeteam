# Add Codex CLI Adapter

## Background
The project currently supports Gemini as an agent adapter. The user wants to add support for the Codex CLI, which follows a similar interaction model but has specific command-line arguments and output patterns.

## Goal
Integrate Codex CLI as a supported adapter in the `vibeteam` project, allowing it to be used in both interactive and headless modes.

## Solution
1.  Create a new `CodexAdapter` class in `src/adapters/codex/`.
2.  Define configuration for Codex (patterns, modes) in `src/adapters/codex/config.json`.
3.  Register the new adapter in `src/adapters/registry.ts`.
