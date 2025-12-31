## Context
The current `Orchestrator` is a "God Class" violating SRP. It manages process execution, file persistence, and event bridging.

## Decisions
- **Split Strategy**:
    - **Types**: Pure data definitions, no dependencies.
    - **SessionManager**: Handles `WorkflowSession` state + `fs` operations. It owns the "State of Truth".
    - **WorkflowExecutor**: Stateless (mostly) engine that takes a Session and moves it forward. It owns `AgentRunner` instances.
    - **Orchestrator**: The public API. Connects UI events to Executor actions.
- **ESLint Flat Config**: Adopting the new standard for future-proofing.
- **Path Resolution**: Prefer dependency injection for paths (pass in constructor) over `__dirname` which is flaky in bundled/TS-node environments.

## Risks
- **Refactoring bugs**: Splitting logic might break the subtle event ordering. Mitigated by splitting tests first/concurrently.
- **Lint churn**: New linter might flag many existing files. We will focus fixes on the refactored files and suppress/legacy-config others if the volume is too high.
