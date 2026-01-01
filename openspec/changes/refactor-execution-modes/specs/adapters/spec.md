## ADDED Requirements
### Requirement: Gemini Headless Launch Config
The Gemini Adapter SHALL provide a headless launch configuration that runs in yolo mode and accepts a positional prompt.

#### Scenario: Positional prompt for headless mode
- **WHEN** the adapter is asked for a headless launch config with a prompt
- **THEN** the arguments include `--approval-mode yolo`
- **AND** the prompt is passed as a positional argument
- **AND** no `--prompt` or `-p` flags are used

## REMOVED Requirements
### Requirement: Gemini Auto Policy
**Reason**: Auto-approve and fallback handlers are removed in favor of explicit headless mode for automation and manual interaction for interactive sessions.
**Migration**: Use headless execution with yolo mode for automated tasks; emit user interactions for interactive tasks.
