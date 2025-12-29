# Change: Add Gemini CLI Adapter (Transparent Proxy)

## Why
To integrate the real Gemini CLI tool as our primary reasoning engine. By using a "Transparent Proxy" approach, we preserve the rich TTY experience of the official CLI while allowing Vibeteam to intelligently detect the session state (e.g., when a task is finished or when a tool needs approval).

## What Changes
- **Transparent Runner**: Update `AgentRunner` logic (if needed) to support direct pipe to stdout.
- **Gemini Adapter**: Implement a concrete `GeminiAdapter` that observers the stream.
- **External Patterns**: Create `src/adapters/gemini-patterns.json` to store regex patterns for state detection.
- **State Sniffing**: The adapter will use these patterns to transition between states without intercepting/modifying the visible output.

## Impact
- **Maintenance**: High. Patterns can be updated via JSON without code changes.
- **User Experience**: Perfect. Users see exactly what the Gemini CLI intended to show.
