# Change: Add Orchestrator Core

## Why
To enable "Tech Lead" capabilities, Vibeteam needs a central brain to manage the lifecycle of AI agents. The `Orchestrator` will manage session state, handle user interactions, and coordinate workflows, serving as the bridge between the raw PTY adapters and the user interface.

## What Changes
- **Core Component**: Implement `Orchestrator` class in `src/orchestrator/Orchestrator.ts`.
- **State Management**: Introduce a lightweight, enum-based state machine (`AgentState`).
- **Context**: Introduce `WorkflowSession` to persist task goals and history.
- **Event Bus**: The Orchestrator will extend `EventEmitter` to broadcast state changes and interaction requests to the UI.

## Impact
- **Architecture**: Establishes the control layer. UI components will now interact with the Orchestrator instead of Adapters directly.
- **Dependencies**: Depends on `IAgentAdapter` interface (decoupled from concrete implementations).
