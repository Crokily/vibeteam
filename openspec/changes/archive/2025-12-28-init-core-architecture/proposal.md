# Change: Initialize Core Architecture

## Why
To enable Vibeteam to act as a "Tech Lead", it needs the fundamental capability to spawn, control, and interact with other CLI tools (Agents) inside a pseudo-terminal (PTY). This preserves the native TTY experience (colors, interactive prompts) of the underlying tools while allowing programmatic orchestration.

## What Changes
- **Infrastructure**: Finalize `node-pty` integration.
- **Core Abstraction**: Introduce `AgentRunner` to manage the process lifecycle.
- **Interfaces**: Define `IAgentAdapter` to standardize how different CLIs are launched and interpreted.
- **Utilities**: Add `AnsiUtils` for cleaning raw terminal output.
- **Verification**: Add a `MockAdapter` (Echo Bot) to test the pipeline without external AI dependencies.

## Impact
- **New Directory**: `src/core/` and `src/adapters/`
- **New Capabilities**: The system will be able to launch a shell, run a command, and capture/sanitize its output programmatically.
