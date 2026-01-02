
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  GeminiAdapter,
  WorkflowDefinition,
  WorkflowExecutor,
  SessionManager,
  AnsiUtils
} from '../src';

// 1. 设置工作目录
const MANUAL_DIR = path.resolve(__dirname, 'manual');

// 2. 创建适配器实例
// 我们需要三个实例，因为每个任务都有独立的状态
const reactAdapter = new GeminiAdapter({
  name: 'ReactDev',
  cwd: MANUAL_DIR
});

const vueAdapter = new GeminiAdapter({
  name: 'VueDev',
  cwd: MANUAL_DIR
});

const bossAdapter = new GeminiAdapter({
  name: 'TechLead',
  cwd: MANUAL_DIR
});

// 3. 定义工作流
const workflow: WorkflowDefinition = {
  id: 'framework-comparison-workflow',
  goal: 'Compare React and Vue and make a decision',
  stages: [
    {
      id: 'research-phase',
      tasks: [
        {
          id: 'task-react',
          adapter: reactAdapter,
          executionMode: 'interactive', // 交互模式
          prompt: '请创建一个名为 react_pros.md 的文件，列出 React 的 3 个主要优点。完成后请告诉我。'
        },
        {
          id: 'task-vue',
          adapter: vueAdapter,
          executionMode: 'interactive', // 交互模式 (并行运行)
          prompt: '请创建一个名为 vue_pros.md 的文件，列出 Vue 的 3 个主要优点。完成后请告诉我。'
        }
      ]
    },
    {
      id: 'decision-phase',
      tasks: [
        {
          id: 'task-decision',
          adapter: bossAdapter,
          executionMode: 'headless', // 无头模式 (自动运行)
          prompt: '读取当前目录下的 react_pros.md 和 vue_pros.md。假设你是一位有10年经验的架构师，分析这两个文件，选择一个适合开发大型后台管理系统的框架，并将你的决定和理由写入 decision.md。'
        }
      ]
    }
  ]
};

// 4. 初始化引擎
const sessionManager = SessionManager.create(workflow.goal || 'Demo Workflow');
const executor = new WorkflowExecutor(sessionManager);

const LOG_DIR = path.resolve(__dirname, 'agent-logs', 'workflow-demo');
const logStreams = new Map<string, fs.WriteStream>();

const ensureLogStream = (taskId: string): fs.WriteStream => {
  let stream = logStreams.get(taskId);
  if (!stream) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const logPath = path.join(LOG_DIR, `${taskId}.txt`);
    stream = fs.createWriteStream(logPath, { flags: 'a' });
    logStreams.set(taskId, stream);
  }
  return stream;
};

const writeLog = (taskId: string, message: string): void => {
  const stream = ensureLogStream(taskId);
  const line = message.endsWith('\n') ? message : `${message}\n`;
  stream.write(line);
};

const closeAllLogs = (): void => {
  for (const stream of logStreams.values()) {
    stream.end();
  }
};

process.on('exit', closeAllLogs);
process.on('SIGINT', () => {
  closeAllLogs();
  process.exit(130);
});

// 5. 设置 CLI 交互 (支持并发路由)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '' // 我们手动控制提示符
});

// 记录哪些任务正在等待输入
const pendingInteractions = new Set<string>();

const printStatus = () => {
  if (pendingInteractions.size > 0) {
    console.log('\n--- Waiting for input ---');
    pendingInteractions.forEach(id => {
      console.log(`* To reply to ${id}, type: @${id} <message>`);
    });
    console.log('-------------------------\n');
  }
};

// 处理 AI 的输出
executor.on('agentEvent', (payload) => {
  const { taskId, event } = payload;
  // 给任务ID上色或加标记，方便区分
  const prefix = `[${taskId}]`; 
  const timestamp = new Date().toISOString();
  
  if (event.type === 'data') {
    const lines = event.clean.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        // 使用 console.log 会自动换行
        process.stdout.write(`${prefix} ${line}\n`);
        writeLog(taskId, `[${timestamp}] ${line}`);
      }
    }
    // 如果有日志输出，可能会把提示顶走，稍微补一下状态提示
    if (pendingInteractions.size > 0) {
      // 这里的逻辑可以优化，避免刷屏，简单起见先不频繁提示
    }
  } else if (event.type === 'error') {
    console.error(`${prefix} ERROR:`, event.error);
    writeLog(taskId, `[${timestamp}] ERROR: ${String(event.error)}`);
  } else if (event.type === 'exit') {
    console.log(`${prefix} EXITED with code ${event.code}`);
    writeLog(taskId, `[${timestamp}] EXIT: code=${event.code ?? 'null'}`);
    pendingInteractions.delete(taskId); // 任务结束，移除等待列表
  }
});

// 处理状态变更
executor.on('stateChange', (change) => {
  console.log(`\n>>> Workflow State Changed: ${change.from} -> ${change.to}\n`);
});

executor.on('taskStatusChange', (change) => {
  console.log(`\n>>> Task ${change.taskId} is now ${change.status}\n`);
  writeLog(change.taskId, `[${new Date().toISOString()}] STATUS: ${change.status}`);
  if (change.status !== 'WAITING_FOR_USER') {
    pendingInteractions.delete(change.taskId);
  }
});

// 处理用户交互请求
executor.on('interactionNeeded', (payload) => {
  const { taskId } = payload;
  if (!pendingInteractions.has(taskId)) {
    pendingInteractions.add(taskId);
    console.log(`\n!!! Task ${taskId} NEEDS YOUR ATTENTION !!!`);
    writeLog(taskId, `[${new Date().toISOString()}] INTERACTION_NEEDED`);
    printStatus();
  }
});

// 监听用户输入
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  // 解析输入指令: @task-id message
  if (trimmed.startsWith('@')) {
    const spaceIndex = trimmed.indexOf(' ');
    let targetTaskId: string;
    let message: string;

    if (spaceIndex === -1) {
      // 用户只输了 @task-id，可能后面没跟内容，或者想发空行
      targetTaskId = trimmed.substring(1);
      message = ''; // 默认为回车
    } else {
      targetTaskId = trimmed.substring(1, spaceIndex);
      message = trimmed.substring(spaceIndex + 1);
    }

    // 模糊匹配任务ID (比如用户只输了 @react 而不是 @task-react)
    const fullTaskId = Array.from(pendingInteractions).find(id => id.includes(targetTaskId));

    if (fullTaskId) {
      console.log(`>>> Sending to ${fullTaskId}: "${message}"`);
      try {
        executor.submitInteraction(fullTaskId, message);
        writeLog(fullTaskId, `[${new Date().toISOString()}] INPUT: ${message}`);
        // 从等待列表中移除，防止重复发送
        pendingInteractions.delete(fullTaskId);
      } catch (e) {
        console.error(`Failed to send: ${e.message}`);
        writeLog(fullTaskId, `[${new Date().toISOString()}] SEND_FAILED: ${String(e)}`);
      }
    } else {
      console.log(`Error: No active task found matching "${targetTaskId}". Waiting tasks: ${Array.from(pendingInteractions).join(', ')}`);
    }
  } else {
    // 如果用户没加 @，且只有一个任务在等，就默认发给那个任务
    if (pendingInteractions.size === 1) {
      const taskId = pendingInteractions.values().next().value;
      console.log(`>>> (Implicit) Sending to ${taskId}: "${trimmed}"`);
      executor.submitInteraction(taskId, trimmed);
      writeLog(taskId, `[${new Date().toISOString()}] INPUT: ${trimmed}`);
      pendingInteractions.delete(taskId);
    } else if (pendingInteractions.size > 1) {
      console.log('Error: Multiple tasks waiting. Please specify target with @task-id <msg>');
      printStatus();
    } else {
      console.log('System: No tasks are currently waiting for input.');
    }
  }
});
// 6. 启动工作流
async function main() {
  console.log('Starting Workflow...');
  console.log(`Working Directory: ${MANUAL_DIR}`);

  try {
    const result = await executor.executeWorkflow(workflow);
    console.log('\nWorkflow Completed!');
    console.log('Final Session State:', JSON.stringify(result, null, 2));
    closeAllLogs();
    process.exit(0);
  } catch (error) {
    console.error('\nWorkflow Failed:', error);
    closeAllLogs();
    process.exit(1);
  }
}

main();
