# Vibeteam

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

**Vibeteam** is a Node.js-based **AI Agent CLI Orchestrator**. It empowers you to freely orchestrate the AI Agent CLIs installed on your machine (like Claude Code, Codex CLI, Gemini CLI, OpenCode CLI, etc.).

Think of Vibeteam as managing a **real software team**. You define the roles, workflows, and configurations for each Agent, and they execute tasks automatically.
*   **100% Native Capabilities**: Since it wraps the actual CLI processes, you retain every feature of the original tools (file access, mcp servers, built-in reasoning, etc.).
*   **Human-in-the-Loop**: You are the manager. You can jump into the workflow at any moment to guide, correct, or approve actions, just like directing a human team member.

### Key Features

*   **Orchestrate Your Local Agents**: Seamlessly coordinate multiple AI Agent CLIs installed on your system.
*   **Real Team Simulation**: Assign specific roles (e.g., "React Specialist", "QA Lead") to different agent instances.
*   **Non-Intrusive Integration**: Wraps CLIs via pseudo-terminals (TTY), preserving their native behavior and "Vibe".
*   **Workflow Automation**: Define complex workflows with sequential stages and parallel tasks.
*   **Seamless Intervention**: In "Interactive Mode," the system alerts you when an agent needs input, allowing you to attach and guide them before they resume automation.
*   **Context Relay**: Automatically passes context (specs, decisions) from one agent to the next.

### Installation

```bash
git clone https://github.com/your-username/vibeteam.git
cd vibeteam
pnpm install
```

### Usage Guide: Creating a Workflow

A workflow in Vibeteam consists of **Adapters** (Roles) and **Stages** (Process).

#### 1. Choose Adapter Types (The Team)
Adapter types identify which CLI tool to launch. Built-in types (like `gemini`) are registered when you import from the main entry point.

```typescript
import { adapterRegistry } from './src';

// Built-in adapters like `gemini` are registered automatically.
// Register custom adapters when you add new ones:
// adapterRegistry.register('my-cli', MyCliAdapter);
```

#### 2. Define the Workflow (The Plan)
Workflows are structured into **Stages**.
*   **Sequential Stages**: Stages run one after another. Stage 2 waits for Stage 1 to finish.
*   **Parallel Tasks**: Tasks *within* a single stage run concurrently.
*   **Task Adapter Config**: Each task can specify `name`, `cwd`, and `env`; `name` defaults to the task id.

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
          adapter: 'gemini',
          name: 'ReactDev', // Name is optional, defaults to task id, can specify a more semantic name
          cwd: './frontend',
          executionMode: 'interactive', // Keeps running for user input
          prompt: 'Implement a login form in React.',
          // Extra args passed to the CLI (e.g., "--model gpt-4")
          extraArgs: ['--verbose', '--model', 'claude-3-opus']
        },
        {
          id: 'dev-vue', // Runs at the same time as dev-react
          adapter: 'gemini',
          name: 'VueDev',
          cwd: './frontend',
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
          adapter: 'gemini',
          name: 'TechLead',
          cwd: './',
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
    *   **User Intervention**: The system detects when the CLI is waiting for input (via pattern matching) and **alerts you**. You can then reply to the specific agent.
    *   **Manual Completion**: In interactive mode, if a CLI tool doesn't exit automatically, you can trigger `executor.completeTask(taskId)` to force-complete the task and advance the workflow.

### Contributing: Adding New Adapters

We welcome contributions! Adding an adapter allows Vibeteam to control a new CLI tool.

#### Structure
Create a new folder in `src/adapters/<your-cli-name>/`.
You typically need two files:
1.  `config.json`: Defines launch arguments and output parsing patterns.
2.  `index.ts`: The adapter class inheriting from `BaseCLIAdapter`.

#### Registration
Register the adapter type once so workflows can reference it by name:

```typescript
import { adapterRegistry } from './src';

adapterRegistry.register('my-new-cli', MyNewAdapter);
```

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

**Vibeteam** 是一个基于 Node.js 的 **AI Agent CLI 编排器**。它让你能够自由编排电脑上已安装的各种 AI Agent CLI（如 Claude Code, Codex CLI, Gemini CLI, OpenCode CLI 等）。

Vibeteam 就像是让你拥有了一个**真实的软件开发团队**。你可以定义每个 Agent 的角色、工作流和配置，让它们自动协作完成任务。
*   **100% 保留原生能力**：Vibeteam 直接包装并运行 CLI 进程，因此你完全保留了这些工具的所有原生功能（包括文件访问、MCP 服务、内置推理能力等）。
*   **随时指挥 (Human-in-the-Loop)**：你可以在工作流的任何时刻介入，进行指导、纠正或审批，就像指挥真实团队成员一样，随后让它们继续自动化执行。

### 核心特性

*   **编排本地 Agents**：无缝协调系统上安装的多个 AI Agent CLI 工具。
*   **真实团队模拟**：为不同的 Agent 实例分配特定角色（如“React 专家”、“QA 负责人”）。
*   **非侵入式集成**：通过伪终端 (TTY) 包装现有 CLI，保留其原生的“Vibe”和所有功能。
*   **工作流自动化**：支持定义包含串行阶段 (Stages) 和并行任务 (Tasks) 的复杂工作流。
*   **无缝介入**：在“交互模式”下，当 Agent 需要反馈时系统会主动提醒你。你可以随时挂载 (attach) 到会话中进行干预，然后恢复自动化流程。
*   **上下文接力**：自动在不同 Agent 之间传递上下文（如需求文档、决策结果）。

### 安装

```bash
git clone https://github.com/your-username/vibeteam.git
cd vibeteam
pnpm install
```

### 使用指南：创建工作流

Vibeteam 的工作流由 **Adapters** (角色) 和 **Stages** (阶段) 组成。

#### 1. 选择 Adapter 类型 (团队成员)
Adapter 类型用来标识要启动的 CLI 工具。通过主入口导入时，内置类型（如 `gemini`）会自动注册。

```typescript
import { adapterRegistry } from './src';

// 内置 adapter（如 `gemini`）已自动注册。
// 新增 adapter 后需要手动注册：
// adapterRegistry.register('my-cli', MyCliAdapter);
```

#### 2. 定义 Workflow (执行计划)
工作流按 **Stages (阶段)** 组织。
*   **串行阶段**：阶段之间按顺序执行。只有当阶段 1 的所有任务完成后，阶段 2 才会开始。
*   **并行任务**：同一个阶段内的所有 `tasks` 会**同时 (Parallel)** 运行。
*   **任务 Adapter 配置**：每个任务可设置 `name`、`cwd`、`env`，其中 `name` 默认等于任务 id。

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
          adapter: 'gemini',
          name: 'ReactDev', // name为可选字段，默认等于任务 id，可以指定一个更具语义化的名称
          cwd: './frontend',
          executionMode: 'interactive', // 交互模式：保持运行等待用户反馈
          prompt: 'Implement a login form in React.',
          // 传递给 CLI 的额外参数 (例如指定模型或开启详细日志)
          extraArgs: ['--verbose', '--model', 'claude-3-opus']
        },
        {
          id: 'dev-vue', // 与 dev-react 同时运行
          adapter: 'gemini',
          name: 'VueDev',
          cwd: './frontend',
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
          adapter: 'gemini',
          name: 'TechLead',
          cwd: './',
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
    *   **用户介入提醒**：系统会通过正则匹配检测 CLI 是否处于“等待输入”状态，并主动**发出提醒**。你可以随后回复特定的 Agent。
    *   **手动完成 (Manual Completion)**：在交互模式下，如果 CLI 工具完成工作但未退出（例如进入了 REPL 循环），你可以调用 `executor.completeTask(taskId)` 强制标记任务完成并终止进程，从而推动工作流进入下一阶段。

### 贡献指南：新增 Adapter

欢迎贡献！新增 Adapter 可以让 Vibeteam 支持更多种类的 CLI 工具。

#### 目录结构
在 `src/adapters/<your-cli-name>/` 下创建新文件夹。
通常包含两个文件：
1.  `config.json`: 定义启动参数和输出解析正则。
2.  `index.ts`: 继承自 `BaseCLIAdapter` 的适配器类。

#### 注册
需要注册 adapter 类型，才能在 workflow 中按名称引用：

```typescript
import { adapterRegistry } from './src';

adapterRegistry.register('my-new-cli', MyNewAdapter);
```

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