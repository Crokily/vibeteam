## Context
The goal is to be a "Tech Lead" over the `gemini` CLI. We don't want to rewrite their UI; we just want to know what's happening.

## Design: The "Observer" Pattern
The `GeminiAdapter` will NOT modify the stream. It will maintain a small ring-buffer of the latest output and check it against known patterns.

### JSON Pattern Schema
`gemini-patterns.json` will look like:
```json
{
  "states": {
    "idle": {
      "pattern": "\n> $",
      "description": "Waiting for user command"
    },
    "interaction_required": {
      "pattern": "\[y/N\]",
      "description": "Waiting for tool execution approval"
    }
  }
}
```

### Flow
1. `AgentRunner` spawns `gemini chat`.
2. All PTY output -> `process.stdout` (Native Vibe).
3. PTY output is ALSO fed into `GeminiAdapter.sniff(chunk)`.
4. If `sniff` matches "interaction_required", the Orchestrator can trigger a UI hint/notification.

