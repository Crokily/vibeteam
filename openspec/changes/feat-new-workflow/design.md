## Context
用户需要在 Electron 应用中创建新工作流。目前只有代码/JSON 方式定义 WorkflowDefinition，缺少 GUI 支持。
目标是提供一个可视化界面，让用户通过拖拽来编排 Agent 的执行顺序和并行关系。

## Goals / Non-Goals
- Goals:
  - 提供可视化的工作流创建界面
  - 支持拖拽编排 Agent 的顺序/并行关系
  - 支持 JSON 导入
  - 为 Adapter 提供元数据（icon, displayName）以优化 UI 显示
- Non-Goals:
  - 不在此阶段实现"常用历史工作流"和"常用 Agent 模板"（后续 proposal）
  - 不实现复杂的连线编辑器（仅需网格拖拽）

## Decisions

### 1. 拖拽库选型
- **Decision**: 使用 `@dnd-kit/core` + `@dnd-kit/sortable`
- **Rationale**: 轻量、React 原生支持、适合网格布局拖拽，比 React Flow 更简单（不需要连线功能）

### 2. Stage 隐式推导算法
- **Decision**: 根据 Agent 卡片的布局位置自动计算 Stage
- **Algorithm**:
  - 同一行（横向并排）的 Agent 归为同一 Stage，并行执行
  - 不同行的 Agent 归为不同 Stage，顺序执行
  - 行号小的 Stage 先执行
- **Data Structure**: 内部用 `{ row: number, col: number, agent: AgentConfig }[]` 表示布局，导出时转换为 `WorkflowStage[]`

### 3. Adapter 元数据存储
- **Decision**: 在 `config.json` 中新增 `metadata` 字段
- **Structure**:
  ```json
  {
    "metadata": {
      "displayName": "Gemini CLI",
      "icon": "gemini"
    },
    "states": { ... },
    "modes": { ... }
  }
  ```
- **Icon 处理**: 前端维护 icon 名称到实际 SVG/组件的映射，后端只存储标识符

### 4. 对话框 vs 独立页面
- **Decision**: 使用全屏对话框（Modal）
- **Rationale**: 保持单页面架构，创建完成后直接看到新的 WorkflowColumn

## Risks / Trade-offs
- **Risk**: 拖拽交互在小屏幕上可能体验不佳
  - Mitigation: 设置最小对话框尺寸；后续可考虑移动端适配
- **Risk**: Stage 隐式推导可能让高级用户觉得不够灵活
  - Mitigation: 提供 JSON 导入作为备选；未来可扩展显式 Stage 编辑

## Open Questions
- Agent 卡片的具体视觉设计（尺寸、颜色方案）待 UI 实现时确定
