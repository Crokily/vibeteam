## ADDED Requirements
### Requirement: Adapter Registry
The system SHALL provide an `AdapterRegistry` to manage adapter type registration and instance creation, enabling dynamic adapter instantiation by type name.

#### Scenario: Register Adapter Type
- **WHEN** `registry.register('gemini', GeminiAdapter)` is called
- **THEN** the adapter type is stored in the registry
- **AND** subsequent `create('gemini', options)` calls return new `GeminiAdapter` instances

#### Scenario: Create Adapter Instance
- **WHEN** `registry.create('gemini', { cwd: './frontend', name: 'ReactDev' })` is called
- **THEN** a new `GeminiAdapter` instance is created with the provided options
- **AND** each call returns a distinct instance (no reuse)

#### Scenario: Unknown Adapter Type
- **WHEN** `registry.create('unknown-type', options)` is called
- **THEN** an error is thrown indicating the adapter type is not registered

### Requirement: Built-in Adapter Registration
The system SHALL pre-register all built-in adapter types (e.g., `gemini`) when the library is imported.

#### Scenario: Default Registry Available
- **WHEN** the user imports from the main entry point
- **THEN** a default registry with built-in adapters is available
- **AND** users can immediately use `'gemini'` as an adapter type in task definitions

## MODIFIED Requirements
### Requirement: Extensible Adapter Architecture
New CLI adapters MUST be implemented by extending a common base class (e.g., `BaseCLIAdapter`) to inherit standard stream handling, buffering, and event management logic. Adapter types MUST be registered with the `AdapterRegistry` to be usable in workflow tasks.

#### Scenario: Minimal Implementation
- **WHEN** a developer adds a new CLI adapter
- **THEN** they only need to implement command configuration and argument parsing
- **AND** do not need to rewrite buffer management or sniffer logic
- **AND** register the adapter type with the registry for workflow integration
