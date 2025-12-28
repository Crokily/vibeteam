## Context
We need to control third-party CLI tools (Gemini, Codex) that behave differently when attached to a TTY vs. a pipe. To support features like spinners, colored output, and interactive prompts, we must use a PTY (Pseudo-Terminal).

## Goals
- **Native Experience**: The child process should believe it is running in a real terminal.
- **Pluggability**: Switching from Gemini to Codex should only require swapping an Adapter.
- **Observability**: We need both the raw output (for display/logging) and sanitized output (for logic/parsing).

## Decisions
- **Decision**: Use `node-pty` over `child_process.spawn`.
    - **Why**: `node-pty` handles the TTY context correctly, ensuring CLIs don't fallback to "dumb" modes.
- **Decision**: Adapter Pattern (`AgentRunner` consumes `IAgentAdapter`).
    - **Why**: Decouples the generic process management (start/stop/IO) from the specific command flags and parsing logic of each AI tool.
- **Decision**: Event-Driven Output.
    - **Why**: CLI output is streaming and asynchronous. The Runner will emit events that the Orchestrator (state machine) listens to.

## Component Diagram
```
[Orchestrator]
      |
      v
[AgentRunner] <--- (uses) --- [IAgentAdapter (Gemini/Mock)]
      |
      v
  [node-pty]
      |
      v
  [OS Shell]
      |
      v
 [CLI Tool (e.g. gemini)]
```
