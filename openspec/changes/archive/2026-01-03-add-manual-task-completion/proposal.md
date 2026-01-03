# Change: Add Manual Task Completion for Interactive Mode

## Why
交互模式下，CLI进程会持续运行等待用户输入。当前任务只在进程 `exit` 时才标记为 `DONE`，导致工作流无法自动推进到下一个阶段。用户完成交互任务后，需要一种方式主动结束任务以推进工作流。

## What Changes
- 在 `TaskRunner` 添加 `completeTask(taskId)` 方法，允许主动完成任务
- 在 `WorkflowExecutor` 暴露 `completeTask` 方法供外部调用
- 调用时停止runner进程并标记任务为 `DONE`
- **MODIFIED**: `core/spec.md` 的 "Task Completion" 要求，增加手动完成场景

## Impact
- Affected specs: `core`
- Affected code:
  - `src/orchestrator/engine/TaskRunner.ts` (添加 completeTask 方法)
  - `src/orchestrator/engine/WorkflowExecutor.ts` (暴露 completeTask)
