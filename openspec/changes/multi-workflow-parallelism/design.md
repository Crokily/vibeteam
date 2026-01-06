# Design: Multi-workflow Parallelism

## 1. UI/UX Design

### 1.1 Layout: The "Command Center"
A horizontal scrolling canvas containing parallel "Tracks" (Columns).

```text
[ VibeTeam Logo ]   [+ New Workflow]                                     [🔔 Notifications]
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  +--+   +-----------------------+   +-----------------------++-----------------------+  |
|  |  |   | 🟢 Deploy to Prod      |   | 🟡 Fix Login Bug       || [Terminal Panel]     |  |
|  |  |   +-----------------------+   +-----------------------++-----------------------+  |
|  |M |   | Status: Running...    |   | Status: Input Needed  || user@dev:~$           |  |
|  |I |   |                       |   |                       || > git commit -m "fix" |  |
|  |N |   | [v] 1. Lint           |   | [v] 1. Repro          ||                       |  |
|  |I |   |                       |   |                       || Please enter 2FA:     |  |
|  |M |   | [>] 2. Build          |   | [!] 2. Commit         || [ ______ ]            |  |
|  |I |   |     [====>      ]     |   |     (Active)          ||                       |  |
|  |Z |   |                       |   |                       ||                       |  |
|  |E |   | [ ] 3. Push           |   |                       ||                       |  |
|  |D |   |                       |   |                       ||                       |  |
|  +--+   +-----------------------+   +-----------------------++-----------------------+  |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
| < Horizontal Scroll Bar >                                                               |
+-----------------------------------------------------------------------------------------+
```

### 1.2 Column States
1.  **Minimized**: 48px width. Vertical text. Status color indicator (Red/Green/Yellow).
2.  **Standard**: ~350px width. Shows Goal, Status, and Task List.
3.  **Expanded**: Standard + Terminal Panel (~500px). Total ~850px. Triggered by clicking a Task.

### 1.3 Notifications
*   **Top Bar Indicator**: Shows count of urgent items (Errors, Inputs).
*   **Interaction**: Clicking a notification auto-scrolls the dashboard to the relevant column and flashes it.

## 2. Architecture Changes

### 2.1 Backend: Orchestrator Multi-Tenancy

**Current**:
```typescript
class Orchestrator {
  session: SessionManager;
  executor: WorkflowExecutor;
}
```

**New**:
```typescript
class Orchestrator {
  // Map<SessionId, Controller>
  private sessions: Map<string, SessionController>;
  
  startSession(goal: string): string; // returns sessionId
  killSession(sessionId: string): void;
  
  // Routes input to specific session
  submitInteraction(sessionId: string, taskId: string, input: string): void;
}

class SessionController {
  manager: SessionManager;
  executor: WorkflowExecutor;
  // Handles events and forwards them with sessionId attached
}
```

### 2.2 IPC Protocol Updates
All events must carry `sessionId`.

*   `orchestrator:taskOutput` -> `{ sessionId, taskId, data ... }`
*   `orchestrator:stateChange` -> `{ sessionId, from, to }`
*   `task:interact` (Renderer -> Main) -> `(sessionId, taskId, input)`

### 2.3 Frontend: State Shape

**Redux Store**:
```typescript
interface AppState {
  // Ordered list of active session IDs for layout
  activeSessionIds: string[];
  
  // Data dictionary
  sessions: Record<string, {
    metadata: SessionSummary;
    tasks: Record<string, TaskState>;
    logs: Record<string, LogEntry[]>; // Consider keeping logs out of main store if huge
    layout: 'minimized' | 'standard' | 'expanded';
  }>;
}
```

### 2.4 Performance Strategy
*   **Terminal Virtualization**: Only render `XTerm` components when the column is visible and expanded.
*   **Log Throttling**: Backend buffers logs (e.g., send every 100ms) to avoid flooding IPC.

## 3. Component Reusability
*   **`WorkflowList`**: Existing component. Wrap in a `WorkflowColumn` container. Remove absolute positioning if any.
*   **`Terminal`**: Existing component. Pass `sessionId` to it so it subscribes to the correct data stream.

## 4. Migration Plan
1.  **Refactor Backend**: Enable `Orchestrator` to handle multiple instances.
2.  **Update IPC**: Change all signatures to include `sessionId`.
3.  **Refactor Frontend**:
    *   Update Store to be keyed by `sessionId`.
    *   Create `Dashboard` and `Column` components.
    *   Refit existing components into the new layout.
