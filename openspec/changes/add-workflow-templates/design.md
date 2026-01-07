## Context
用户希望快速复用高频使用的配置，但手动保存模板（命名、管理）负担过重。
系统应全自动记录用户的使用习惯，根据**复用次数**推荐 Top 10 工作流和 Agent，并自动清理低频历史。

## Goals / Non-Goals
- Goals:
  - **自动统计**：每次执行工作流时，自动记录 Workflow 和 Agent 的配置。
  - **智能去重**：通过计算配置 Hash，识别相同的配置并增加计数。
  - **自动淘汰**：仅保留 Top 20 条记录，防止历史数据膨胀。
  - **逻辑下沉**：统计、排序、淘汰逻辑全部在后端实现，前端仅负责展示。
  - **零配置**：无需用户命名、无需手动保存 Icon。
- Non-Goals:
  - 不提供手动“另存为”功能（P0）。
  - 不提供手动删除统计记录的功能（P0）。
  - 不提供对推荐记录的重命名功能。

## Decisions

### 1. 存储位置
- **Decision**: 使用 `userData/stats/` 目录
- **Rationale**: 与 Session 数据隔离，专门用于存储统计聚合信息。
- **Files**:
  ```
  userData/
  ├── sessions/        # 完整的运行时记录 (Heavy)
  │   └── *.json
  └── stats/           # 统计索引 (Lightweight)
      ├── workflow-usage.json
      └── agent-usage.json
  ```

### 2. 数据模型 (Usage Stats)
不再存储“模板”，而是存储“使用记录”。

#### 2.1 AgentUsageEntry
- **Key**: `hash(adapter + mode + prompt + env)`
- **Value**:
  ```typescript
  {
    count: number;          // 复用次数
    lastUsed: number;       // 最后使用时间戳
    config: {               // Agent 配置快照
      adapter: string;
      mode: string;
      prompt: string;
      // ...其他关键字段
    }
  }
  ```

#### 2.2 WorkflowUsageEntry
- **Key**: `hash(stages + tasks structure)`
- **Value**:
  ```typescript
  {
    count: number;
    lastUsed: number;
    definition: WorkflowDefinition; // 完整定义快照
  }
  ```

### 3. 核心逻辑 (Backend Service)
所有逻辑封装在 `UsageStatsService` 中。

#### 3.1 Hash 计算 (去重)
- **Workflow Hash**: `MD5(JSON.stringify(stages))`。忽略 `id`, `goal` (每次可能不同), `createdAt` 等易变字段。
- **Agent Hash**: `MD5(JSON.stringify({adapter, mode, prompt}))`。忽略 `id`, `name`。

#### 3.2 淘汰策略 (Eviction Policy)
- **Max Items**: 20
- **Trigger**: 每次写入新记录或更新计数后检查。
- **Algorithm**:
  1. 按 `count` 降序排序。
  2. 若 `count` 相同，按 `lastUsed` 降序排序。
  3. 保留前 20 项，删除剩余项。

### 4. UI 交互设计
- **Sidebar (Top 10 Workflows)**:
  - 标题: "Frequent Workflows"
  - 列表: 显示 Workflow 的首个 Task Prompt 摘要，或 adapter 组合图标 (e.g. "Gemini -> Codex")。
  - 点击: 弹出确认框 "Replace current canvas?" -> 确认后覆盖。
- **Bottom Bar (Top 10 Agents)**:
  - 标题: "Frequent Agents"
  - 列表: 显示 Agent Card (Adapter Icon + Prompt 摘要 + Count Badge)。
  - 点击: 直接追加到 Canvas 末尾。

### 5. Icon 处理
- **Decision**: 完全自动化。
- **Implementation**: 前端维护 Adapter Type -> SVG Icon 的映射表。
- **Rationale**: 用户根本不关心 Icon 配置，那是系统该做的事。

## Risks / Trade-offs
- **Risk**: 统计数据膨胀。
  - Mitigation: 已实施严格的 Max 20 淘汰策略。
- **Risk**: 隐私问题。
  - Mitigation: 统计数据仅存储在本地 `userData`，不上云。

## Open Questions
- 如果用户修改了推荐的 Agent 再次运行，会生成新的 Hash 条目。是否需要模糊匹配？（P1 考虑，P0 暂不实现，目前按严格 Hash 处理）

