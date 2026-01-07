# Change: 新增工作流创建窗口与可视化编排

## Why
当前 "New Workflow" 按钮只是占位符，用户无法在 UI 中创建和配置新的工作流。需要提供一个直观的可视化界面，让用户能够创建 Agent、配置参数、并通过拖拽编排执行顺序和并行关系。

## What Changes
- 新增 Adapter 元数据配置（icon、displayName）
- 新增 IPC 命令获取可用 Adapter 列表
- 新增工作流创建对话框组件
- 新增 Agent 卡片组件（可拖拽）
- 新增可视化编排画布（上下=顺序，左右=并行）
- 新增 JSON 导入功能
- 隐式推导 Stage 结构（无需用户手动创建 Stage）

## Impact
- Affected specs: `electron-app`, `adapters`
- Affected code:
  - `src/adapters/*/config.json` - 新增 metadata 字段
  - `src/adapters/registry.ts` - 新增 getAdapterMetadata 方法
  - `electron/shared/ipc-types.ts` - 新增 IPC 类型
  - `electron/main/ipc/handlers.ts` - 新增 handler
  - `electron/renderer/src/components/workflow-creator/` - 新组件目录
