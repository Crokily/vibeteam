# Change: Add Electron Desktop Application Foundation

## Why
Vibeteam 目前仅作为 Node.js 库存在，用户只能通过编程方式调用。为了提供更直观的用户体验，需要构建一个桌面应用界面。Electron 方案能够：
- 完整保留 node-pty 的 PTY 能力
- 直接集成现有 Orchestrator 代码
- 通过 xterm.js 原生渲染 TUI 输出（无需特殊解析）

本提案聚焦于**基础框架搭建**，不包含具体业务 UI 组件。

## What Changes
- 新增 `electron/` 目录结构，包含 main/preload/renderer 三层
- 基于 `electron-vite` 搭建构建系统（Vite + React + TypeScript）
- 定义类型安全的 IPC 通道契约（Commands + Events）
- 集成 Tailwind CSS 样式系统
- 集成 Zustand 状态管理基础
- 集成 electron-store 配置持久化

## Impact
- Affected specs: 新增 `electron-app` capability
- Affected code: 新增 `electron/` 目录，修改 `package.json`
- 不影响现有 `src/` 核心库代码

## Technical Decisions

### 技术栈选型
| 技术 | 版本 | 用途 |
|------|------|------|
| electron | ^33.0.0 | 桌面应用框架 |
| electron-vite | ^3.0.0 | 构建工具 |
| React | ^18.3.0 | UI 框架 |
| Tailwind CSS | ^3.4.0 | 样式系统 |
| Zustand | ^5.0.0 | 状态管理 |
| Zod | ^3.24.0 | 运行时类型校验 |
| xterm.js | ^5.5.0 | 终端渲染（后续提案使用）|
| electron-store | ^10.0.0 | 配置持久化 |
| electron-builder | ^25.0.0 | 应用打包 |

### 架构决策：放弃 tRPC，使用 typed IPC
- **原因**：Vibeteam 核心是事件驱动架构（EventEmitter），tRPC 的 request/response 模式与实时事件流推送不匹配
- **方案**：通过 TypeScript 类型定义 + Zod 运行时校验实现类型安全的 IPC 通信
- **收益**：减少依赖复杂度，直接映射现有事件系统到 IPC

### 目录结构
```
vibeteam/
├── src/                    # 现有核心库（不变）
├── electron/               # 新增 Electron 应用
│   ├── main/
│   │   ├── index.ts       # Main process 入口
│   │   └── ipc/           # IPC handlers 定义
│   │       └── index.ts
│   ├── preload/
│   │   └── index.ts       # contextBridge 暴露 API
│   └── renderer/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── stores/    # Zustand stores
│       │   └── main.tsx
│       └── index.html
├── electron.vite.config.ts
├── electron-builder.json
└── package.json            # 更新依赖
```

## Out of Scope (后续提案)
1. **任务监控 UI** - xterm.js 终端面板、任务状态展示
2. **交互响应系统** - 交互提醒、用户输入处理
3. **会话管理** - 历史会话列表、恢复/重放
4. **工作流编辑器** - 可视化定义 Workflow（DAG 连接线）
5. **配置界面** - Adapter 配置 GUI
