## 1. Adapter 元数据扩展
- [x] 1.1 更新 `src/adapters/gemini/config.json` 添加 metadata 字段
- [x] 1.2 更新 `PatternLoader` 解析 metadata
- [x] 1.3 为 `AdapterRegistry` 添加 `getRegisteredTypes()` 和 `getMetadata(type)` 方法
- [x] 1.4 编写单元测试

## 2. IPC 层扩展
- [x] 2.1 在 `ipc-types.ts` 添加 `adapter:list` 命令类型和 `AdapterMeta` 类型
- [x] 2.2 在 `ipc-schemas.ts` 添加对应 Zod schema
- [x] 2.3 在 `handlers.ts` 实现 `adapter:list` handler
- [x] 2.4 在 `preload/index.ts` 和 `ipc-client.ts` 暴露 API

## 3. 工作流创建对话框
- [x] 3.1 安装 `@dnd-kit/core` 和 `@dnd-kit/sortable`
- [x] 3.2 创建 `WorkflowCreatorDialog` 组件骨架
- [x] 3.3 实现顶部区域（workflow id、工作目录、导入按钮）
- [x] 3.4 实现 Agent 创建表单（adapter 选择、prompt、mode、高级配置折叠）

## 4. 可视化编排画布
- [x] 4.1 创建 `AgentCard` 组件（显示 icon、prompt 截断、mode 图标）
- [x] 4.2 创建 `WorkflowCanvas` 组件（网格布局 + dnd-kit 拖拽）
- [x] 4.3 实现拖拽排序逻辑（行内拖拽改并行顺序，跨行拖拽改执行顺序）
- [x] 4.4 实现 Stage 隐式推导算法（layout → WorkflowDefinition 转换）

## 5. JSON 导入功能
- [x] 5.1 实现 JSON 解析和 WorkflowDefinition 校验
- [x] 5.2 实现从 WorkflowDefinition 反向生成布局

## 6. 集成与测试
- [x] 6.1 将对话框集成到 Header "New Workflow" 按钮
- [x] 6.2 实现创建后调用 `workflow:execute` 启动工作流
- [ ] 6.3 E2E 测试：创建 → 拖拽编排 → 执行
