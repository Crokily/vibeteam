## 1. Core Utilities
- [x] 1.1 Implement `AnsiUtils` to strip ANSI escape codes from strings.
- [x] 1.2 Add unit tests for `AnsiUtils`.

## 2. Abstractions
- [x] 2.1 Define `IAgentAdapter` interface (launch config, output handlers).
- [x] 2.2 Define types for `AgentEvent` (Data, Exit, Error).

## 3. Process Management
- [x] 3.1 Implement `AgentRunner` class using `node-pty`.
- [x] 3.2 Implement lifecycle methods: `start()`, `send(input)`, `stop()`.
- [x] 3.3 Implement event emission for raw and clean output.

## 4. Verification
- [x] 4.1 Implement `MockAdapter` (simple shell echo behavior).
- [x] 4.2 Write an integration test: Spawn Runner with MockAdapter -> Send "Ping" -> Expect "Pong" (or echo).