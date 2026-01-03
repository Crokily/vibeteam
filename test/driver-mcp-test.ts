import * as path from 'path';

import { Orchestrator, WorkflowDefinition } from '../src/index';
import {
  assertFilesExist,
  assertLogsHealthy,
  createLogManager,
  resetFiles,
  withTimeout,
} from './integration-helpers';

const TIMEOUT_MS = 10 * 60 * 1000;
const LOGS_DIR = path.join(process.cwd(), 'test', 'agent-logs');
const TASK_IDS = ['search-tauri', 'search-electron', 'final-recommender'];
const OUTPUT_FILES = [
  path.join(process.cwd(), 'test', 'tauri.md'),
  path.join(process.cwd(), 'test', 'electron.md'),
  path.join(process.cwd(), 'test', 'recommendation.md'),
];

const log = (msg: string) => {
  console.log(`[mcp-test] ${msg}`);
};

const buildWorkflow = (): WorkflowDefinition => ({
  id: 'mcp-search-comparison',
  goal: '2025 cross platform selection research',
  stages: [
    {
      id: 'stage-search',
      tasks: [
        {
          id: 'search-tauri',
          adapter: 'gemini',
          name: 'Tauri Researcher',
          executionMode: 'headless',
          prompt: `
你是一名技术调研员。

任务：
1. 使用联网搜索工具调查 Tauri 2.0 在 2025 年的现状。
2. 将调研结果写入 'test/tauri.md' 文件。
注意：请确保使用 web_search_exa 进行搜索。
`,
        },
        {
          id: 'search-electron',
          adapter: 'gemini',
          name: 'Electron Researcher',
          executionMode: 'headless',
          prompt: `
你是一名技术调研员。

任务：
1. 使用联网搜索工具调查 Electron 在 2025 年的现状。
2. 将调研结果写入 'test/electron.md' 文件。
`,
        },
      ],
    },
    {
      id: 'stage-recommendation',
      tasks: [
        {
          id: 'final-recommender',
          adapter: 'gemini',
          name: 'Chief Architect',
          executionMode: 'headless',
          prompt: `
你是一名首席架构师。

任务：
1. 仅使用已注册的工具：read_file、search_file_content、web_search_exa（如需联网）。
2. 使用 read_file 读取 'test/tauri.md' 和 'test/electron.md' 的内容。
3. 汇总并给出 2025 年多 AI CLI 编排项目的最终选型建议。
4. 使用 write_file 将建议写入 'test/recommendation.md'。
5. 不要使用 run_shell_command 或任何未注册的工具。
`,
        },
      ],
    },
  ],
});

async function runMcpIntegration(): Promise<void> {
  const failures: string[] = [];
  const unexpectedInteractions: string[] = [];

  resetFiles(OUTPUT_FILES);

  const logManager = createLogManager(LOGS_DIR, { truncate: true });
  for (const taskId of TASK_IDS) {
    logManager.ensureLogStream(taskId);
  }

  const orchestrator = new Orchestrator();

  orchestrator.on('taskStatusChange', ({ taskId, status }) => {
    log(`task ${taskId} -> ${status}`);
    if (status === 'ERROR') {
      failures.push(`Task ${taskId} reported ERROR state.`);
    }
  });

  orchestrator.on('interactionNeeded', ({ taskId, payload }) => {
    const detail = `Unexpected interaction for ${taskId}: ${JSON.stringify(payload)}`;
    unexpectedInteractions.push(detail);
    log(detail);
    logManager.writeLog(taskId, `${detail}\n`);
    try {
      orchestrator.submitInteraction(taskId, '/exit');
    } catch (error) {
      log(`Failed to send /exit to ${taskId}: ${String(error)}`);
    }
  });

  orchestrator.on('taskOutput', ({ taskId, clean }) => {
    logManager.writeLog(taskId, clean);
  });

  try {
    await withTimeout(orchestrator.executeWorkflow(buildWorkflow()), TIMEOUT_MS, 'mcp-test');
  } catch (error) {
    failures.push(`Workflow failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await logManager.closeAll();
    orchestrator.disconnect();
  }

  if (unexpectedInteractions.length > 0) {
    failures.push(`Unexpected interactions: ${unexpectedInteractions.join(' | ')}`);
  }

  try {
    assertFilesExist(OUTPUT_FILES, { requireNonEmpty: true });
  } catch (error) {
    failures.push(`${error instanceof Error ? error.message : String(error)}`);
  }

  const logPaths = TASK_IDS.map((taskId) => logManager.getLogPath(taskId));
  try {
    assertLogsHealthy(logPaths);
  } catch (error) {
    failures.push(`${error instanceof Error ? error.message : String(error)}`);
  }

  if (failures.length > 0) {
    console.error('[mcp-test] Integration test failed');
    for (const failure of failures) {
      console.error(`[mcp-test] ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  log('Integration test passed.');
}

runMcpIntegration().catch((error) => {
  console.error(`[mcp-test] Unhandled error: ${String(error)}`);
  process.exitCode = 1;
});
