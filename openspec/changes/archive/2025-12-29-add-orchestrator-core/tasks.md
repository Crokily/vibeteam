## 1. Data Structures
- [x] 1.1 Define `AgentState` enum (IDLE, RUNNING, AWAITING_INTERACTION, PAUSED, ERROR).
- [x] 1.2 Implement `WorkflowSession` class to hold `goal`, `history`, and `startTime`.

## 2. Orchestrator Implementation
- [x] 2.1 Create `Orchestrator` class extending `EventEmitter`.
- [x] 2.2 Implement `connect(adapter: IAgentAdapter)` method.
- [x] 2.3 Implement state transition logic (handle adapter events -> update state -> emit event).
- [x] 2.4 Implement `startTask(goal)` and `submitInteraction(input)` methods.
- [x] 2.5 Implement runner cleanup + `disconnect()` to allow reconnect.

## 3. Testing
- [x] 3.1 Write unit test: "Auto-Approve Workflow".
    - Mock an adapter that emits `interaction_needed`.
    - Orchestrator should receive it, check config (mocked as auto), and immediately call `runner.send('y')`.
    - Verify state goes RUNNING -> AWAITING -> RUNNING.
- [x] 3.2 Write unit test: cleanup on exit + reconnect support.
