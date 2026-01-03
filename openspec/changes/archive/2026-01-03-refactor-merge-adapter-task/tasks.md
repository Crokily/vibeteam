## 1. Core Type Changes
- [x] 1.1 Create `AdapterType` type and `AdapterRegistry` class in `src/adapters/registry.ts`
- [x] 1.2 Update `WorkflowTask` type in `src/orchestrator/types.ts` (adapter → string, add cwd/env/name fields)
- [x] 1.3 Add `name` field with default-to-id logic

## 2. Adapter Registry Implementation
- [x] 2.1 Implement `AdapterRegistry.register()` and `AdapterRegistry.create()` methods
- [x] 2.2 Register built-in adapters (GeminiAdapter) in `src/index.ts`
- [x] 2.3 Export registry from main entry point

## 3. TaskRunner Integration
- [x] 3.1 Update `TaskRunner.runTask()` to create adapter instances via registry
- [x] 3.2 Pass task's cwd/env/name to adapter constructor
- [x] 3.3 Update `runnerFactory.ts` to handle new task structure

## 4. Workflow Validation
- [x] 4.1 Update `workflowValidation.ts` to validate adapter type string
- [x] 4.2 Add validation for unknown adapter types

## 5. Tests
- [x] 5.1 Add unit tests for `AdapterRegistry`
- [x] 5.2 Update `TaskRunner.test.ts` with new task format
- [x] 5.3 Update `WorkflowExecutor.test.ts`
- [x] 5.4 Update integration tests (`workflow-demo.ts`, `driver-*.ts`)

## 6. Documentation
- [x] 6.1 Update `README.md` usage examples (both EN and CN sections)
- [x] 6.2 Update `openspec/specs/adapters/spec.md`
- [x] 6.3 Update `openspec/specs/core/spec.md`
