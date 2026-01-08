# Refactor: Adapter Factory Pattern

## Why
As the project prepares to scale from 2 to 30+ adapters, the current inheritance-based pattern (even with the shared `AdapterConfigLoader`) still requires significant boilerplate for each new adapter. 

Each adapter currently requires:
1. A `config.json` file.
2. An `index.ts` class definition that manually calls the config loader, calls `super()`, sets commands, and handles error logging.

This repetition violates DRY and increases maintenance costs. If we need to change how adapters are initialized (e.g., adding telemetry or changing error handling), we would need to modify 30+ files.

## What Changes
We will introduce a **Factory Pattern** to standardize adapter creation.

### 1. New Factory Component
Create `src/adapters/base/AdapterFactory.ts`.
This module will export a `createCLIAdapter` function that:
- Accepts a simple definition object: `{ name, command?, config, ... }`.
- Automatically handles configuration loading (using the existing `AdapterConfigLoader`).
- Returns a fully functional Adapter class extending `BaseCLIAdapter`.
- Centralizes error handling and logging logic.

### 2. Refactor Existing Adapters
- **GeminiAdapter**: Replace the class definition with a factory call.
- **CodexAdapter**: Replace the class definition with a factory call.

### 3. Documentation
Update `openspec/specs/adapters/spec.md` to recommend the Factory Pattern as the standard way to create new adapters.

## Impact
- **New Adapters**: Creation becomes a 1-minute task (config + 1 line of code).
- **Maintenance**: Initialization logic is centralized in one place.
- **Compatibility**: The factory returns a class that is compatible with the existing `IAgentAdapter` interface, so no changes are needed in the Orchestrator or Task Runner.
