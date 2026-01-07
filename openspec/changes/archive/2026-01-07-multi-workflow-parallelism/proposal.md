# Proposal: Multi-workflow Parallelism

## 1. Goal
Transform VibeTeam from a single-threaded workflow executor into a multi-tasking **Parallel Workflow Dashboard**. This allows users to create, monitor, and interact with multiple independent workflows simultaneously, significantly improving efficiency for complex development tasks.

## 2. Core Concept Shifts

### From "Single Executor" to "Executor Fleet"
*   **Current**: One `Orchestrator` instance holds one `SessionManager` and one `WorkflowExecutor`.
*   **New**: `Orchestrator` becomes a container managing a `Map<string, WorkflowSessionController>`. Each controller encapsulates a `SessionManager` and `WorkflowExecutor` for a specific `sessionId`.

### From "Single View" to "Columnar Dashboard"
*   **Current**: Split view (Workflow Left / Terminal Right).
*   **New**: **Horizontal Infinite Scroll Dashboard**.
    *   Each workflow is a vertical **Column**.
    *   Columns can be minimized, standardized (task list only), or expanded (task list + terminal).
    *   Global Notification Center (Mac-style) for cross-workflow alerts.

### Session Definition Refined
*   **Session** remains the persistent record of a job (logs, status, history).
*   **Runtime**: Multiple sessions can be "Active" (in-memory, executing) simultaneously.

## 3. Key Features

1.  **Parallel Execution**:
    *   Run multiple workflows (e.g., "Build App" and "Run Tests") concurrently.
    *   Background execution persists even when the user is not focusing on the specific column.

2.  **Dashboard UI**:
    *   **Layout**: Flexbox-based horizontal scroll container.
    *   **Workflow Column**:
        *   **Header**: Status icon, Goal title, Minimize/Close controls.
        *   **Body**: Task list with progress indicators.
        *   **Terminal Drawer**: Expands to the right of the task list when a task is clicked.
    *   **Virtualization**: Optimization for rendering multiple active terminals.

3.  **Global Notifications**:
    *   Unified indicator in the top bar (e.g., `[🔔 2]`).
    *   Clicking notifies/scrolls to the specific workflow column requiring attention.

4.  **Lifecycle Management**:
    *   **Create**: "New Workflow" button spawns a new column.
    *   **Minimize**: Collapse column to save space without stopping execution.
    *   **Close**:
        *   If running: Prompt to kill processes.
        *   If done: Archive session and remove from view.

## 4. Technical Scope

### Backend (Electron/Node)
*   Refactor `Orchestrator.ts` to manage multiple sessions.
*   Update IPC events to include `sessionId` payload.
*   Ensure `stdout/stderr` streams are correctly routed to the specific session.

### Frontend (React)
*   **State Management**: Update Redux/Zustand store to hold `Record<string, SessionState>`.
*   **Components**:
    *   `DashboardLayout`: Horizontal scroll container.
    *   `WorkflowColumn`: The main container for a single session.
    *   `NotificationCenter`: Top-right global alert system.
*   **Reuse**: Adapt existing `WorkflowList` and `Terminal` components to fit into the new Column structure.

## 5. User Impact
*   **Pros**: drastically increased multitasking capability; "God Mode" visibility.
*   **Cons**: Higher screen space requirement (solved by horizontal scroll and folding); Higher memory usage (solved by virtualization and efficient resource management).
