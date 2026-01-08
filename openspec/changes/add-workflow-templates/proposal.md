# Change: 常用工作流与 Agent 智能推荐系统 (Smart Usage Stats)

## Why
用户希望能快速复用高频使用的配置，但不希望进行繁琐的手动“另存为”和命名操作。
系统应自动学习用户的使用习惯，根据**复用次数**智能推荐最常用的工作流和 Agent 配置。

## What Changes
- **新增使用统计服务 (UsageStatsService)**
  - 自动追踪每次成功执行的 Workflow 和 Agent。
  - 基于配置内容计算 Hash（指纹），识别重复配置。
  - 维护引用计数 (Usage Count) 和最后使用时间 (Last Used)。
  - **自动淘汰机制**：每个类别（Workflow/Agent）最多保留 20 条记录，超出时自动删除使用频率最低的记录。
- **数据存储**
  - `stats/workflow-usage.json`: 存储 Top 20 工作流配置及其统计数据。
  - `stats/agent-usage.json`: 存储 Top 20 Agent 配置及其统计数据。
- **IPC 扩展**
  - `stats:get-top-workflows`: 获取排序后的工作流列表。
  - `stats:get-top-agents`: 获取排序后的 Agent 列表。
- **UI 更新 (WorkflowCreatorDialog)**
  - **Sidebar**: 显示 "Frequent Workflows" 列表。
  - **Bottom Bar**: 显示 "Frequent Agents" 列表。
  - **Icon**: 移除用户配置，UI 根据 Adapter 类型自动显示对应 Logo。

## Impact
- Affected specs: `electron-app`
- Affected code:
  - `src/orchestrator/stats/UsageStatsService.ts` - 新增统计服务（包含 Hash、计数、淘汰逻辑）
  - `electron/main/ipc/handlers.ts` - 新增 stats 相关 handler
  - `electron/renderer/src/components/workflow-creator/` - 更新侧边栏和底栏逻辑

