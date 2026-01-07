## ADDED Requirements

### Requirement: Adapter Metadata Configuration
Adapters SHALL include metadata in their configuration file to support UI display.

#### Scenario: Metadata Fields
- **WHEN** an adapter configuration is loaded
- **THEN** the system reads optional `metadata` section containing `displayName` and `icon` fields
- **AND** missing metadata fields default to the adapter type name and a generic icon

#### Scenario: Metadata Schema
- **WHEN** the `metadata` section exists in `config.json`
- **THEN** it SHALL contain:
  - `displayName` (string): Human-readable name for UI display
  - `icon` (string): Icon identifier for frontend icon mapping

### Requirement: Adapter Type Enumeration
The `AdapterRegistry` SHALL provide methods to enumerate registered adapter types and their metadata.

#### Scenario: List Registered Types
- **WHEN** `registry.getRegisteredTypes()` is called
- **THEN** it returns an array of all registered adapter type names

#### Scenario: Get Adapter Metadata
- **WHEN** `registry.getMetadata(type)` is called with a registered type
- **THEN** it returns the metadata object for that adapter
- **AND** includes `displayName`, `icon`, and supported `modes`

#### Scenario: Unknown Type Metadata
- **WHEN** `registry.getMetadata(type)` is called with an unregistered type
- **THEN** it returns `undefined`
