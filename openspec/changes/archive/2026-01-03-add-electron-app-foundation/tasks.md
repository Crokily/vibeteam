## 1. 项目脚手架搭建
- [x] 1.1 使用 electron-vite 初始化项目结构
- [x] 1.2 配置 TypeScript（main/preload/renderer 各自的 tsconfig）
- [x] 1.3 集成 React 18 + Vite 配置
- [x] 1.4 集成 Tailwind CSS
- [x] 1.5 更新 package.json（添加 Electron 脚本和依赖）

## 2. IPC 通道定义
- [x] 2.1 创建共享类型定义文件 `electron/shared/ipc-types.ts`
- [x] 2.2 实现 preload 脚本（contextBridge 暴露 API）
- [x] 2.3 创建 Main process IPC handlers 骨架
- [x] 2.4 创建 Renderer 端 IPC 调用封装 hooks

## 3. 状态管理基础
- [x] 3.1 集成 Zustand
- [x] 3.2 创建 AppStore 基础结构
- [x] 3.3 实现 IPC 事件订阅的 store 更新逻辑

## 4. 配置持久化
- [x] 4.1 集成 electron-store
- [x] 4.2 定义配置 schema（Zod）
- [x] 4.3 实现配置读写 IPC handlers

## 5. 基础 UI 骨架
- [x] 5.1 创建主窗口布局组件
- [x] 5.2 添加基础路由（如需要）
- [x] 5.3 验证开发环境 HMR 正常工作

## 6. 构建验证
- [x] 6.1 验证 `pnpm dev:electron` 开发模式正常
- [x] 6.2 验证 `pnpm build:electron` 生产构建正常
- [x] 6.3 验证 node-pty 原生模块正确链接
