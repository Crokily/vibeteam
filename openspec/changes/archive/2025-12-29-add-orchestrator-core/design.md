## Context
The Orchestrator is the "Manager". It needs to be lightweight but robust enough to handle the asynchronous nature of CLI tools.

## Design Decisions

### 1. Zero-Dependency State Machine
We will NOT use XState.
```typescript
enum AgentState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  AWAITING_INTERACTION = 'AWAITING_INTERACTION',
  ERROR = 'ERROR'
}
```
The state is just a property on the class. Transitions are method calls.

### 2. Event-Driven Architecture
```mermaid
sequenceDiagram
    participant User
    participant Orchestrator
    participant Adapter
    
    User->>Orchestrator: startTask("Build snake game")
    Orchestrator->>Adapter: send("Build snake game")
    Adapter-->>Orchestrator: event(DATA) "Thinking..."
    Adapter-->>Orchestrator: event(INTERACTION_NEEDED) "[y/N]"
    Orchestrator->>Orchestrator: state = AWAITING_INTERACTION
    Orchestrator-->>User: event(INTERACTION_REQUIRED)
    User->>Orchestrator: submitInteraction("y")
    Orchestrator->>Adapter: send("y")
    Orchestrator->>Orchestrator: state = RUNNING
```

### 3. Session Isolation
The `WorkflowSession` object ensures that if we restart the CLI, we don't lose the high-level goal or the history of what we've done (in memory for now, persistable to JSON later).
