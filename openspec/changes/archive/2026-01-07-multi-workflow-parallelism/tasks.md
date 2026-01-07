# Tasks: Multi-workflow Parallelism

## Phase 1: Backend Architecture (Multi-Tenancy)

- [x] **Refactor `Orchestrator` Class** <!-- id: 0 -->
    - Change internal state to manage a `Map<string, SessionController>`.
    - Implement `startSession(goal)` returning `sessionId`.
    - Implement `stopSession(sessionId)` and `removeSession(sessionId)`.
- [x] **Create `SessionController`** <!-- id: 1 -->
    - Extract single-session logic (Executor + SessionManager pairing) into this new class.
    - Ensure it handles event forwarding with `sessionId` injection.
- [x] **Update IPC Layer** <!-- id: 2 -->
    - Modify `electron/main/orchestrator.ts` to support the new `Orchestrator` API.
    - Update `ipc-types.ts`: Add `sessionId` to `TaskOutput`, `TaskStatusChange`, `InteractionNeeded`.
    - Update `ipc-schemas.ts` (if validation exists).

## Phase 2: Frontend State & Data Layer

- [x] **Update Store/Context** <!-- id: 3 -->
    - Refactor `app-store.ts` (or equivalent) to support `Record<string, SessionState>`.
    - Add `activeSessions` list to track order of columns.
    - Update `ipc-sync.ts` to dispatch actions to the correct session slice based on `sessionId`.
- [x] **Update IPC Client** <!-- id: 4 -->
    - Update `lib/ipc-client.ts` methods to accept `sessionId` as a required argument.

## Phase 3: UI Implementation (Dashboard)

- [x] **Create `DashboardLayout`** <!-- id: 5 -->
    - Implement horizontal scrolling container (Flexbox).
    - Add "New Workflow" placeholder column.
- [x] **Create `WorkflowColumn` Component** <!-- id: 6 -->
    - Implement the 3 states: Minimized, Standard, Expanded.
    - Implement Header (Status, Title, Actions).
    - Reuse `WorkflowStage/TaskList` components inside the body.
- [x] **Update Terminal Integration** <!-- id: 7 -->
    - Make Terminal panel a collapsible drawer within `WorkflowColumn`.
    - Ensure it connects to the correct session log stream.
- [x] **Implement Notification Center** <!-- id: 8 -->
    - Create top-bar badge component.
    - Implement "Scroll to Column" logic on click.

## Phase 4: Integration & Polish

- [x] **Lifecycle Testing** <!-- id: 9 -->
    - Verify creating multiple sessions works.
    - Verify parallel execution (logs don't mix).
    - Verify closing/archiving sessions.
- [x] **Performance Tuning** <!-- id: 10 -->
    - Implement virtualization/unmounting for off-screen Terminals.
    - Stress test with 5+ concurrent workflows.
- [x] **Design Review** <!-- id: 11 -->
    - Apply "Industrial/Cyberpunk" styling touches (borders, colors).
