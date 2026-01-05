## 1. 依赖安装
- [x] 1.1 安装 `@xterm/xterm` 和 `@xterm/addon-fit`
- [x] 1.2 配置 xterm.css 导入

## 2. Store 改造
- [x] 2.1 修改 `taskOutputs` 结构，同时存储 raw 和 cleaned
- [x] 2.2 添加 `clearTaskOutputs` action（用于重置）

## 3. 终端组件实现
- [x] 3.1 创建 `components/terminal/XTermTerminal.tsx` - xterm.js 封装组件
- [x] 3.2 实现 Terminal 实例生命周期管理（创建/销毁）
- [x] 3.3 实现 FitAddon 集成和 resize 处理
- [x] 3.4 实现 `onData` 事件处理（键盘输入 → IPC）

## 4. Tab 组件实现
- [x] 4.1 创建 `components/terminal/TerminalTabs.tsx` - Tab 列表组件
- [x] 4.2 实现 Tab 切换逻辑
- [x] 4.3 实现交互提醒指示器（当 task 在 pendingInteractions 中）

## 5. 主布局实现
- [x] 5.1 创建 `components/layout/MainLayout.tsx` - 主布局容器
- [x] 5.2 创建 `components/layout/Sidebar.tsx` - 侧边栏占位（简化版）
- [x] 5.3 创建 `components/layout/Header.tsx` - 顶部状态栏
- [x] 5.4 重构 `App.tsx` 使用新布局

## 6. 数据流集成
- [x] 6.1 实现 taskOutput → Terminal.write(raw) 的订阅
- [x] 6.2 实现 interactionNeeded → Tab 高亮（不自动切换）
- [x] 6.3 实现 terminal.onData() → task:interact IPC 调用

## 7. 样式和交互
- [x] 7.1 配置 xterm.js 主题（与 Tailwind 主题协调）
- [x] 7.2 实现 Tab 交互提醒动画
