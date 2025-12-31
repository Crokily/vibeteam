# Change: Refactor Auto Policy

## Why
The current automatic response logic is too simple and brittle. It does not support complex scenarios where different adapters require different strategies (e.g., command-line flags vs. interactive runtime key presses). We need a robust pattern that binds the automation policy to the specific Adapter, while the Orchestrator remains responsible only for the execution signal.

## What Changes
- **Foundation**: Introduce `AutoPolicy` type with `injectArgs` (startup flags) and `handlers` (runtime actions).
- **Core**: 
  - Update `IAgentAdapter` to optionally include `autoPolicy`.
  - Update `Orchestrator` to inject arguments at startup if `autoApprove` is enabled.
  - Update `Orchestrator` to delegate runtime interaction handling to the Adapter's policy.
- **Adapters**: 
  - Update `GeminiAdapter` to define a policy using `--approval-mode yolo` and a fallback enter-key handler.

## Impact
- **Affected Specs**: `core`, `adapters`
- **Affected Code**: `src/core`, `src/orchestrator`, `src/adapters`
- **Breaking Changes**: Minimal. `IAgentAdapter` change is additive (optional property). Orchestrator behavior changes only when `autoApprove` is enabled.
