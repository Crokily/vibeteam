# Design: Codex CLI Adapter

## Architecture
The `CodexAdapter` will extend `BaseCLIAdapter`, similar to `GeminiAdapter`.

### Directory Structure
```
src/adapters/codex/
├── index.ts          # Adapter class
├── config.json       # Patterns and modes
├── configLoader.ts   # Configuration loading logic
└── CodexAdapter.test.ts
```

### Configuration (`config.json`)

#### Metadata
- **displayName**: "Codex CLI"
- **icon**: "codex" (or a suitable generic icon if not available)

#### Modes
- **Interactive**:
    - Command: `codex`
    - Base Args: `[]`
    - Prompt Position: `last`
- **Headless**:
    - Command: `codex`
    - Base Args: `["exec", "--yolo"]` (Assuming `codex exec --yolo "prompt"` is valid)
    - Prompt Position: `last`

#### States & Patterns
- **interaction_handler** (Confirmation):
    - Pattern: `› 1. Yes, proceed \(y\)`
    - Description: "Codex CLI execution confirmation menu"
- **interaction_idle** (Input):
    - Pattern: `^>\s*`
    - Description: "Codex CLI standard input prompt"

### Integration
- Register in `src/adapters/registry.ts`.

