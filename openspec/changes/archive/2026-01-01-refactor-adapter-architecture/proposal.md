# Change: Refactor Adapter Architecture

## Why
The current adapter implementation (`GeminiAdapter`) violates the Single Responsibility Principle by mixing configuration, state management, buffering, and event handling. This creates a "God Class" tendency, making it difficult to add new adapters (e.g., Claude, DeepSeek) without significant code duplication. The flat directory structure in `src/adapters` also increases cognitive load.

## What Changes
- **Extract Base Class**: Create `BaseCLIAdapter` to handle generic IO, buffering, event emitting, and error handling.
- **Decouple Sniffer**: Extract regex state detection logic into a standalone `OutputSniffer` class.
- **Restructure Directory**: Move adapters into dedicated subdirectories (`src/adapters/gemini/`, `src/adapters/base/`).
- **Refactor Gemini**: Simplify `GeminiAdapter` to only contain configuration and specific argument parsing, inheriting all behavioral logic from the base class.

## Impact
- **Affected Specs**: `adapters`
- **Affected Code**: 
    - `src/adapters/*` (Heavy Refactoring)
    - `src/orchestrator/` (Import path updates)
    - `test/` (Test imports and potentially mocking strategies)
