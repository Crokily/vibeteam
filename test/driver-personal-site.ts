import * as path from 'path';

import { Orchestrator, WorkflowDefinition } from '../src/index';
import {
  assertFilesExist,
  assertLogsHealthy,
  createLogManager,
  ensureFile,
  resetFiles,
  withTimeout,
} from './integration-helpers';

const TIMEOUT_MS = 10 * 60 * 1000;
const LOGS_DIR = path.join(process.cwd(), 'test', 'agent-logs');
const TASK_IDS = ['architect-agent', 'dev-home', 'dev-projects', 'qa-agent'];
const OUTPUT_FILES = [
  path.join(process.cwd(), 'test', 'design.md'),
  path.join(process.cwd(), 'test', 'index.html'),
  path.join(process.cwd(), 'test', 'projects.html'),
];
const TEXT_PATH = path.join(process.cwd(), 'test', 'text.txt');

const SAMPLE_PROFILE = `
Name: Alex Rivera
Role: Frontend Engineer
Bio: Alex builds product-focused web experiences and enjoys clean visual systems.
Experience:
- 2021-2024: Built design systems and landing pages for SaaS products.
- 2018-2021: Developed marketing sites for startups.
Projects:
- Nova UI: Component library for internal apps.
- Orion Dashboard: Analytics frontend for ecommerce teams.
`;

const log = (msg: string) => {
  console.log(`[personal-site] ${msg}`);
};

const buildWorkflow = (): WorkflowDefinition => ({
  id: 'personal-site-generator',
  goal: 'Generate a personal website from the provided profile',
  stages: [
    {
      id: 'stage-planning',
      tasks: [
        {
          id: 'architect-agent',
          adapter: 'gemini',
          name: 'Architect',
          executionMode: 'headless',
          prompt: `
你是一名高级网站架构师。
请读取当前目录下的 'test/text.txt' 文件内容。

任务：
1. 分析用户的个人资料。
2. 制定两个页面的详细开发计划：
   - index.html (个人首页)
   - projects.html (项目页)
3. 将详细的设计方案（包含配色、布局、功能点）写入到 'test/design.md' 文件中。

请注意：必须生成真实的 Markdown 文件，供后续开发人员参考。并且你的任务只是写方案，MUST不进行开发。
`,
        },
      ],
    },
    {
      id: 'stage-development',
      tasks: [
        {
          id: 'dev-home',
          adapter: 'gemini',
          name: 'Home Page Developer',
          executionMode: 'headless',
          prompt: `
你是一名初级前端工程师。

任务：
1. 首先读取 'test/design.md' 中的设计方案。
2. 参考 'test/text.txt' 中的个人资料内容。
3. 严格按照设计方案，在 'test/' 目录下创建 'index.html' 文件。
4. 内容要求：
   - 包含用户的姓名、职业和简介。
   - 添加一个导航链接指向 'projects.html'。

请直接执行写文件操作。
`,
        },
        {
          id: 'dev-projects',
          adapter: 'gemini',
          name: 'Projects Page Developer',
          executionMode: 'headless',
          prompt: `
你是一名初级前端工程师。

任务：
1. 首先读取 'test/design.md' 中的设计方案。
2. 参考 'test/text.txt' 中的项目经历部分。
3. 严格按照设计方案，在 'test/' 目录下创建 'projects.html' 文件。
4. 内容要求：
   - 使用列表展示项目。
   - 添加一个导航链接返回 'index.html'。

请直接执行写文件操作。
`,
        },
      ],
    },
    {
      id: 'stage-review',
      tasks: [
        {
          id: 'qa-agent',
          adapter: 'gemini',
          name: 'QA Reviewer',
          executionMode: 'headless',
          prompt: `
你是一名 QA 测试工程师。

任务：
1. 检查 'test/index.html' 和 'test/projects.html' 是否都已存在。
2. 读取这两个文件的内容，检查是否包含了 'test/text.txt' 中的关键信息。
3. 如果一切正常，输出 "测试通过：网站构建完成"。
4. 如果有问题，简要列出缺失的部分。
`,
        },
      ],
    },
  ],
});

async function runPersonalSiteIntegration(): Promise<void> {
  const failures: string[] = [];
  const unexpectedInteractions: string[] = [];

  ensureFile(TEXT_PATH, SAMPLE_PROFILE.trim() + '\n');
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
    await withTimeout(
      orchestrator.executeWorkflow(buildWorkflow()),
      TIMEOUT_MS,
      'personal-site',
    );
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
    console.error('[personal-site] Integration test failed');
    for (const failure of failures) {
      console.error(`[personal-site] ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  log('Integration test passed.');
}

runPersonalSiteIntegration().catch((error) => {
  console.error(`[personal-site] Unhandled error: ${String(error)}`);
  process.exitCode = 1;
});
