## 1. Backend - Usage Statistics Service
- [x] 1.1 Create `src/orchestrator/stats/UsageStatsService.ts`
  - [x] Implement `recordWorkflowUsage(workflow: WorkflowDefinition)`
  - [x] Implement `recordAgentUsage(agent: WorkflowTask)`
  - [x] Implement `getTopWorkflows(limit: number)`
  - [x] Implement `getTopAgents(limit: number)`
  - [x] Implement Hash generation logic (MD5 of stable fields)
  - [x] Implement **Max 20 Eviction Policy** (sort by count desc, then lastUsed desc)
  - [x] Implement persistence to `userData/stats/*.json`
- [x] 1.2 Integrate into `Orchestrator.ts`
  - [x] Initialize `UsageStatsService`
  - [x] Call `recordWorkflowUsage` when workflow starts
  - [x] Call `recordAgentUsage` for each task when workflow starts

## 2. IPC Layer
- [x] 2.1 Add stats types to `electron/shared/ipc-types.ts`
  - [x] Define `WorkflowUsageEntry` and `AgentUsageEntry`
- [x] 2.2 Add Zod schemas to `electron/shared/ipc-schemas.ts`
- [x] 2.3 Implement IPC handlers in `electron/main/ipc/handlers.ts`:
  - `stats:get-top-workflows`
  - `stats:get-top-agents`

## 3. Frontend - Workflow Sidebar (Frequent)
- [x] 3.1 Create `FrequentWorkflowsSidebar.tsx`
  - [x] Fetch top workflows on mount
  - [x] Render list with simplified view (Adapter Icons sequence + First Prompt Summary)
  - [x] Implement "Replace Canvas" logic with confirmation

## 4. Frontend - Agent Bar (Frequent)
- [x] 4.1 Create `FrequentAgentsBar.tsx`
  - [x] Fetch top agents on mount
  - [x] Render compact Agent Cards with Usage Badge (🔥 count)
  - [x] Auto-resolve icons based on Adapter type
  - [x] Implement "Add to Canvas" logic
