import { existsSync, mkdirSync, rmSync } from 'fs';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SessionManager } from './SessionManager';

const TEST_DIR = path.join(__dirname, 'test-tmp');

describe('SessionManager', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR);
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('persists session state to disk', () => {
    const manager = SessionManager.create('test-goal', { baseDir: TEST_DIR });
    manager.updateTaskStatus('task-1', 'RUNNING');
    manager.appendLog('task-1', 'line-1');
    manager.addHistory('initial prompt', 'task-1');
    manager.persist();

    const loaded = SessionManager.load(manager.getSession().id, { baseDir: TEST_DIR });
    const session = loaded.getSession();

    expect(session.id).toBe(manager.getSession().id);
    expect(session.goal).toBe('test-goal');
    expect(session.taskStatus['task-1']).toBe('RUNNING');
    expect(session.logs['task-1']).toEqual(['line-1']);
    expect(session.history.some((entry) => entry.includes('initial prompt'))).toBe(
      true,
    );
  });

  it('persists and loads workflow definition', () => {
    const workflow: any = {
      id: 'test-wf',
      goal: 'test goal',
      stages: [
        {
          id: 's1',
          tasks: [
            {
              id: 't1',
              adapter: 'gemini', // Using a valid string, though type checking might be loose here in tests
              prompt: 'do something',
            },
          ],
        },
      ],
    };

    const manager = SessionManager.create('goal', { baseDir: TEST_DIR });
    manager.initializeWorkflow(workflow);
    manager.persist();

    const loaded = SessionManager.load(manager.getSession().id, {
      baseDir: TEST_DIR,
    });
    const loadedSession = loaded.getSession();

    expect(loadedSession.workflowDefinition).toBeDefined();
    expect(loadedSession.workflowDefinition?.id).toBe(workflow.id);
    expect(loadedSession.workflowDefinition?.stages).toHaveLength(1);
    expect(loadedSession.workflowDefinition?.stages[0].tasks[0].prompt).toBe(
      'do something',
    );
  });
});
