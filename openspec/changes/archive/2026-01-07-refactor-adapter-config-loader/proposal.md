# Refactor Adapter Configuration Loading

## Context
Currently, each adapter (e.g., `GeminiAdapter`, `CodexAdapter`) implements its own `configLoader.ts`. These files share approximately 90% of their logic, including:
- File reading and JSON parsing.
- Pattern validation via `PatternLoader`.
- Mode configuration validation (`loadModesConfig`).
- Fallback to embedded configuration.

This duplication violates the DRY (Don't Repeat Yourself) principle and increases the maintenance burden. Any improvement or bug fix to the configuration loading logic must be manually applied to every adapter.

## Goal
Centralize the configuration loading logic into a single, reusable utility within `src/adapters/base/`. This will simplify existing adapters and make creating new adapters significantly easier.

## Changes

### 1. New Shared Component
Create `src/adapters/base/AdapterConfigLoader.ts` (or `ConfigLoader.ts` in `src/adapters/` if preferred, but `base` seems more appropriate for shared implementation details).

This loader will expose a generic function:
```typescript
export function loadAdapterConfig<TConfig>(
  adapterName: string,
  embeddedConfig: unknown,
  configPath?: string
): ConfigLoadResult
```

It will handle:
- Resolving paths based on `adapterName`.
- Loading and parsing the file.
- Validating patterns and modes.
- Merging with/falling back to `embeddedConfig`.
- Providing default metadata based on `adapterName` if missing.

### 2. Refactor Adapters
- Update `src/adapters/gemini/index.ts` to use `loadAdapterConfig`.
- Update `src/adapters/codex/index.ts` to use `loadAdapterConfig`.
- Delete `src/adapters/gemini/configLoader.ts`.
- Delete `src/adapters/codex/configLoader.ts`.

### 3. Documentation Update
- Update `openspec/specs/adapters/spec.md` to reflect that adapters SHOULD use the shared configuration loader to ensure consistency.
