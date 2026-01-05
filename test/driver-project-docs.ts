import * as path from 'path';

import { Orchestrator, WorkflowDefinition } from '../src/index';
import {
  assertFilesExist,
  assertLogsHealthy,
  createLogManager,
  resetFiles,
  withTimeout,
} from './integration-helpers';

const TIMEOUT_MS = 15 * 60 * 1000;
const LOGS_DIR = path.join(process.cwd(), 'test', 'agent-logs');
const TASK_IDS = [
  'doc-core',
  'doc-adapters',
  'doc-orchestrator',
  'doc-tooling',
  'doc-synthesis',
];
const OUTPUT_FILES = [
  path.join(process.cwd(), 'test', 'project-core.md'),
  path.join(process.cwd(), 'test', 'project-adapters.md'),
  path.join(process.cwd(), 'test', 'project-orchestrator.md'),
  path.join(process.cwd(), 'test', 'project-tooling.md'),
  path.join(process.cwd(), 'test', 'project-docs.md'),
];

const log = (msg: string) => {
  console.log(`[project-docs] ${msg}`);
};

const buildWorkflow = (): WorkflowDefinition => ({
  id: 'project-docs-generator',
  goal: 'Generate comprehensive project documentation',
  stages: [
    {
      id: 'stage-analysis',
      tasks: [
        {
          id: 'doc-core',
          adapter: 'gemini',
          name: 'Core Analyst',
          executionMode: 'headless',
          prompt: `
You are a technical writer analyzing the core runtime module.

Scope:
- src/core/AgentRunner.ts
- src/core/HeadlessRunner.ts
- src/core/AnsiUtils.ts
- src/core/AgentEvent.ts
- src/core/*.test.ts

Tasks:
1) Use read_file and search_file_content to understand the core runtime responsibilities.
2) Write a module document to "test/project-core.md" with sections:
   - Overview
   - Key Files and Responsibilities
   - Data Flow (events, stdout/stderr handling)
   - Execution Modes (PTY vs headless)
   - Public APIs and Events
   - Tests and Coverage Notes
   - Extension Points / Risks

Constraints:
- Write the documentation in Chinese.
- Use only read_file, search_file_content, and write_file.
- Do not use run_shell_command or web_search_exa.
- Avoid writing the literal strings "ERROR:" or "error:" in the output.
`,
        },
        {
          id: 'doc-adapters',
          adapter: 'gemini',
          name: 'Adapter Analyst',
          executionMode: 'headless',
          prompt: `
You are a technical writer analyzing the adapter layer.

Scope:
- src/adapters/IAgentAdapter.ts
- src/adapters/GeminiAdapter.ts
- src/adapters/PatternLoader.ts
- src/adapters/gemini-patterns.json
- src/adapters/*.test.ts

Tasks:
1) Use read_file and search_file_content to understand adapter responsibilities and patterns.
2) Write a module document to "test/project-adapters.md" with sections:
   - Overview
   - Adapter Contract (interfaces, optional methods)
   - Gemini Adapter Behavior (headless args, pattern loading)
   - Pattern Detection Workflow
   - Tests and Coverage Notes
   - Extension Points / Risks

Constraints:
- Write the documentation in Chinese.
- Use only read_file, search_file_content, and write_file.
- Do not use run_shell_command or web_search_exa.
- Avoid writing the literal strings "ERROR:" or "error:" in the output.
`,
        },
        {
          id: 'doc-orchestrator',
          adapter: 'gemini',
          name: 'Orchestrator Analyst',
          executionMode: 'headless',
          prompt: `
You are a technical writer analyzing the orchestrator layer.

Scope:
- src/orchestrator/Orchestrator.ts
- src/orchestrator/WorkflowExecutor.ts
- src/orchestrator/SessionManager.ts
- src/orchestrator/WorkflowSession.ts
- src/orchestrator/types.ts
- src/orchestrator/*.test.ts

Tasks:
1) Use read_file and search_file_content to understand workflow execution and session handling.
2) Write a module document to "test/project-orchestrator.md" with sections:
   - Overview
   - Workflow Model (stages, tasks, execution modes)
   - Execution Lifecycle (events, state changes)
   - Session Persistence and History
   - Interaction Handling
   - Tests and Coverage Notes
   - Extension Points / Risks

Constraints:
- Write the documentation in Chinese.
- Use only read_file, search_file_content, and write_file.
- Do not use run_shell_command or web_search_exa.
- Avoid writing the literal strings "ERROR:" or "error:" in the output.
`,
        },
        {
          id: 'doc-tooling',
          adapter: 'gemini',
          name: 'Tooling Analyst',
          executionMode: 'headless',
          prompt: `
You are a technical writer analyzing project structure and tooling.

Scope:
- package.json
- tsconfig.json
- eslint.config.mjs
- src/index.ts
- src/poc.ts
- openspec/project.md
- openspec/specs/**
- test/*.ts (integration scripts)

Tasks:
1) Use read_file and search_file_content to understand repository structure and tooling.
2) Write a module document to "test/project-tooling.md" with sections:
   - Overview
   - Project Layout (folders and responsibilities)
   - Tooling and Scripts (build, test, lint)
   - OpenSpec Workflow Summary
   - Integration Scripts and How to Run
   - Risks / Operational Notes

Constraints:
- Write the documentation in Chinese.
- Use only read_file, search_file_content, and write_file.
- Do not use run_shell_command or web_search_exa.
- Avoid writing the literal strings "ERROR:" or "error:" in the output.
`,
        },
      ],
    },
    {
      id: 'stage-synthesis',
      tasks: [
        {
          id: 'doc-synthesis',
          adapter: 'gemini',
          name: 'Lead Documentation Architect',
          executionMode: 'headless',
          prompt: `
You are a lead documentation architect. Synthesize module documentation into a comprehensive guide.

Inputs:
- test/project-core.md
- test/project-adapters.md
- test/project-orchestrator.md
- test/project-tooling.md

Tasks:
1) Read the four module documents.
2) Write a comprehensive project documentation page to "test/project-docs.md" using a common documentation format with sections such as:
   - Title + Executive Summary
   - Architecture Overview (modules and responsibilities)
   - Workflow Execution (stages, tasks, execution modes)
   - Module Breakdown (short summaries + links)
   - Data Flow (events, session persistence, output handling)
   - Development and Testing (commands and tips)
   - Extension Points
   - Glossary
3) Add a short index at the top referencing the module documents.

Constraints:
- Write the documentation in Chinese.
- Use only read_file and write_file.
- Do not use run_shell_command or web_search_exa.
- Avoid writing the literal strings "ERROR:" or "error:" in the output.
`,
        },
      ],
    },
  ],
});

async function runProjectDocsIntegration(): Promise<void> {
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
      orchestrator.submitInteraction(taskId, '/exit\r');
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
      'project-docs',
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
    console.error('[project-docs] Integration test failed');
    for (const failure of failures) {
      console.error(`[project-docs] ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  log('Integration test passed.');
}

runProjectDocsIntegration().catch((error) => {
  console.error(`[project-docs] Unhandled error: ${String(error)}`);
  process.exitCode = 1;
});
