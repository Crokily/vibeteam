# Vibeteam

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

**Vibeteam** is a Node.js-based **AI Workflow Orchestrator**. It acts as a "Technical Lead," managing and coordinating a specialized team of AI CLI tools (like Gemini CLI, Claude CLI, etc.).

Unlike traditional integrations that rely on direct API calls, Vibeteam wraps third-party CLI tools using `node-pty`. This **non-intrusive** approach preserves the native capabilities of these tools (file access, built-in agents, toolchains) while enabling automated context passing and sophisticated orchestration.

### Key Features

*   **Non-Intrusive Integration**: Wraps existing CLIs via pseudo-terminals (TTY), keeping their native behavior and "Vibe" intact.
*   **Workflow Orchestration**: Define complex workflows with sequential stages and parallel tasks.
*   **Human-in-the-Loop (HITL)**: Supports "Interactive Mode" where the user can attach to a running session, provide input, and then let the automation resume.
*   **Context Relay**: Automatically passes context (specs, decisions) from one agent to the next.

### Installation

```bash
git clone https://github.com/your-username/vibeteam.git
cd vibeteam
pnpm install
```

### Usage Guide: Creating a Workflow

A workflow in Vibeteam consists of **Adapters** (Roles) and **Stages** (Process).

#### 1. Define Adapters (The Team)
Adapters represent the specific CLI tools or "Agents" you want to use.

```typescript
import { GeminiAdapter } from './src';

// Define agents with specific working directories or configurations
const reactDev = new GeminiAdapter({ name: 'ReactDev', cwd: './frontend' });
const techLead = new GeminiAdapter({ name: 'TechLead', cwd: './' });
```

#### 2. Define the Workflow (The Plan)
Workflows are structured into **Stages**.
*   **Sequential Stages**: Stages run one after another. Stage 2 waits for Stage 1 to finish.
*   **Parallel Tasks**: Tasks *within* a single stage run concurrently.

```typescript
const workflow = {
  id: 'feature-dev',
  goal: 'Implement Login',
  stages: [
    {
      id: 'implementation-phase',
      // Both React and Vue tasks run in PARALLEL here
      tasks: [
        {
          id: 'dev-react',
          adapter: reactDev,
          executionMode: 'interactive', // Keeps running for user input
          prompt: 'Implement a login form in React.'
        },
        {
          id: 'dev-vue', // Runs at the same time as dev-react
          adapter: vueAdapter,
          executionMode: 'interactive',
          prompt: 'Implement a login form in Vue.'
        }
      ]
    },
    {
      id: 'review-phase',
      // Runs only after BOTH tasks in implementation-phase are DONE
      tasks: [
        {
          id: 'code-review',
          adapter: techLead,
          executionMode: 'headless', // Automated mode
          prompt: 'Review the code generated in the previous step.'
        }
      ]
    }
  ]
};
```

#### 3. Execution Modes & Manual Completion
*   **`headless`**: Automated mode. The task runs until the process exits naturally.
*   **`interactive`**: The process stays alive waiting for user input.
    *   **Manual Completion**: In interactive mode, if a CLI tool doesn't exit automatically, you can trigger `executor.completeTask(taskId)` to force-complete the task and advance the workflow.

### Contributing: Adding New Adapters

We welcome contributions! Adding an adapter allows Vibeteam to control a new CLI tool.

#### Structure
Create a new folder in `src/adapters/<your-cli-name>/`.
You typically need two files:
1.  `config.json`: Defines launch arguments and output parsing patterns.
2.  `index.ts`: The adapter class inheriting from `BaseCLIAdapter`.

#### The "Headless" Mode Definition
When configuring your adapter, pay attention to the **Headless** mode definition.
> **Note**: **Headless Mode** implies a fully automated, "one-shot" execution where the agent is granted full permission to execute actions without user confirmation. It should not prompt for input.

**Example `config.json`**:
```json
{
  "modes": {
    "interactive": {
      "baseArgs": ["chat", "--interactive"], // Arguments for human-in-the-loop
      "promptPosition": "last"
    },
    "headless": {
      "baseArgs": ["run", "--force", "--yes"], // Arguments for auto-execution
      "promptPosition": "flag",
      "promptFlag": "--prompt"
    }
  },
  "patterns": [
    { "name": "WAITING_FOR_USER", "regex": "\\? |> $" }
  ]
}
```

#### Implementation
Inherit from `BaseCLIAdapter` to handle the TTY complexity automatically.

```typescript
export class MyNewAdapter extends BaseCLIAdapter {
  readonly name = 'my-new-cli';
  // ... constructor loading config
  protected getDefaultCommand(): string {
    return 'my-cli-cmd';
  }
}
```

---

<a name="chinese"></a>
## 🇨🇳 中文

**Vibeteam** 是一个基于 Node.js 的 **AI 工作流编排器 (AI Workflow Orchestrator)**。它就像一位“技术负责人 (Tech Lead)”，管理并协调一系列专业的 AI CLI 工具（如 Gemini CLI, Claude CLI 等）。

不同于传统的 API 调用集成，Vibeteam 通过 `node-pty` 包装第三方 CLI 工具。这种**非侵入式**的方法完整保留了工具的原生能力（如文件系统访问、内置 Agent 能力、工具链），同时实现了自动化的上下文传递和复杂的流程编排。

### 核心特性

*   **非侵入式集成**：通过伪终端 (TTY) 包装现有 CLI，保留其原生的“Vibe”和所有功能。
*   **工作流编排**：支持定义包含串行阶段 (Stages) 和并行任务 (Tasks) 的复杂工作流。
*   **人机协作 (HITL)**：支持“交互模式”，用户可以随时挂载 (attach) 到正在运行的会话中进行干预，然后恢复自动化流程。
*   **上下文接力**：自动在不同 Agent 之间传递上下文（如需求文档、决策结果）。

### 安装

```bash
git clone https://github.com/your-username/vibeteam.git
cd vibeteam
pnpm install
```

### 使用指南：创建工作流

Vibeteam 的工作流由 **Adapters** (角色) 和 **Stages** (阶段) 组成。

#### 1. 定义 Adapters (团队成员)
Adapter 代表了你想要使用的具体 CLI 工具或“Agent”。

```typescript
import { GeminiAdapter } from './src';

// 定义具有特定工作目录或配置的 Agent
const reactDev = new GeminiAdapter({ name: 'ReactDev', cwd: './frontend' });
const techLead = new GeminiAdapter({ name: 'TechLead', cwd: './' });
```

#### 2. 定义 Workflow (执行计划)
工作流按 **Stages (阶段)** 组织。
*   **串行阶段**：阶段之间按顺序执行。只有当阶段 1 的所有任务完成后，阶段 2 才会开始。
*   **并行任务**：同一个阶段内的所有 `tasks` 会**同时 (Parallel)** 运行。

```typescript
const workflow = {
  id: 'feature-dev',
  goal: 'Implement Login',
  stages: [
    {
      id: 'implementation-phase',
      // React 和 Vue 的任务会在这里并行运行
      tasks: [
        {
          id: 'dev-react',
          adapter: reactDev,
          executionMode: 'interactive', // 交互模式：保持运行等待用户反馈
          prompt: 'Implement a login form in React.'
        },
        {
          id: 'dev-vue', // 与 dev-react 同时运行
          adapter: vueAdapter,
          executionMode: 'interactive',
          prompt: 'Implement a login form in Vue.'
        }
      ]
    },
    {
      id: 'review-phase',
      // 只有当 implementation-phase 的两个任务都变成 DONE 后，才会执行此阶段
      tasks: [
        {
          id: 'code-review',
          adapter: techLead,
          executionMode: 'headless', // 自动模式
          prompt: 'Review the code generated in the previous step.'
        }
      ]
    }
  ]
};
```

#### 3. 执行模式与手动完成
*   **`headless` (自动模式)**：任务自动运行直到进程自然退出。
*   **`interactive` (交互模式)**：进程保持活跃，等待用户输入。
    *   **手动完成 (Manual Completion)**：在交互模式下，如果 CLI 工具完成工作但未退出（例如进入了 REPL 循环），你可以调用 `executor.completeTask(taskId)` 强制标记任务完成并终止进程，从而推动工作流进入下一阶段。

### 贡献指南：新增 Adapter

欢迎贡献！新增 Adapter 可以让 Vibeteam 支持更多种类的 CLI 工具。

#### 目录结构
在 `src/adapters/<your-cli-name>/` 下创建新文件夹。
通常包含两个文件：
1.  `config.json`: 定义启动参数和输出解析正则。
2.  `index.ts`: 继承自 `BaseCLIAdapter` 的适配器类。

#### 关于 "Headless" 模式的定义
在配置 Adapter 时，请特别注意 **Headless** 模式的定义。
> **注意**：**Headless Mode** 指的是一种**全自动、一次性、且被授予完全权限**的执行模式。在此模式下，CLI 应当被配置为不询问用户确认（例如使用 `--yolo` 或 `--force` 参数），并直接执行任务直到结束。

**`config.json` 示例**:
```json
{
  "modes": {
    "interactive": {
      "baseArgs": ["chat", "--interactive"], // 适合人机交互的参数
      "promptPosition": "last"
    },
    "headless": {
      "baseArgs": ["run", "--force", "--yes"], // 适合自动执行的参数
      "promptPosition": "flag",
      "promptFlag": "--prompt"
    }
  },
  "patterns": [
    { "name": "WAITING_FOR_USER", "regex": "\\? |> $" }
  ]
}
```

#### 代码实现
继承 `BaseCLIAdapter` 可以自动处理大部分 TTY 交互逻辑。

```typescript
export class MyNewAdapter extends BaseCLIAdapter {
  readonly name = 'my-new-cli';
  // ... 构造函数加载配置
  protected getDefaultCommand(): string {
    return 'my-cli-cmd'; // 用户系统中的实际命令
  }
}
```