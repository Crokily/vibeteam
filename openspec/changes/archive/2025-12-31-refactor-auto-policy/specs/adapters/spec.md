## ADDED Requirements
### Requirement: Gemini Auto Policy
The Gemini Adapter SHALL provide an automation policy optimized for the tool's capabilities.

#### Scenario: Yolo Mode Injection
- **WHEN** the Gemini Adapter's policy is accessed
- **THEN** it includes `--approval-mode yolo` in `injectArgs`

#### Scenario: Fallback Handler
- **WHEN** the Gemini Adapter's policy is accessed
- **THEN** it includes a runtime handler that presses Enter for any unmatched interactions as a fallback
