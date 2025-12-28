## 1. Core Utilities
- [ ] 1.1 Implement `AnsiUtils` to strip ANSI escape codes from strings.
- [ ] 1.2 Add unit tests for `AnsiUtils`.

## 2. Abstractions
- [ ] 2.1 Define `IAgentAdapter` interface (launch config, output handlers).
- [ ] 2.2 Define types for `AgentEvent` (Data, Exit, Error).

## 3. Process Management
- [ ] 3.1 Implement `AgentRunner` class using `node-pty`.
- [ ] 3.2 Implement lifecycle methods: `start()`, `send(input)`, `stop()`.
- [ ] 3.3 Implement event emission for raw and clean output.

## 4. Verification
- [ ] 4.1 Implement `MockAdapter` (simple shell echo behavior).
- [ ] 4.2 Write an integration test: Spawn Runner with MockAdapter -> Send "Ping" -> Expect "Pong" (or echo).
