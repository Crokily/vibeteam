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

  it('prunes old sessions when limit is exceeded', () => {
    // MAX_SESSIONS is 50. We'll create 55 sessions.
    const sessionsToCreate = 55;
    const createdIds: string[] = [];

    for (let i = 0; i < sessionsToCreate; i++) {
      const manager = SessionManager.create(`prune-test-${i}`, { baseDir: TEST_DIR });
      manager.persist();
      createdIds.push(manager.getSession().id);
      
      // Ensure distinct mtimes for stable sorting on fast systems
      const filePath = SessionManager.getSessionPath(manager.getSession().id, TEST_DIR);
      const fs = require('fs');
      const time = new Date();
      time.setSeconds(time.getSeconds() + i); // artificially space them out
      fs.utimesSync(filePath, time, time);
    }

    const sessionDir = SessionManager.getSessionDir(TEST_DIR);
    const fs = require('fs');
    const files = fs
      .readdirSync(sessionDir)
      .filter((f: string) => f.endsWith('.json'));

    expect(files.length).toBe(50);

    // The first 5 sessions (index 0-4) should have been pruned.
    // The sessions with index 5-54 (50 sessions) should remain.
    const remainingIds = files.map((f: string) => path.basename(f, '.json'));
    
    // Check that the newest ones are present
    expect(remainingIds).toContain(createdIds[54]);
    expect(remainingIds).toContain(createdIds[50]);
    expect(remainingIds).toContain(createdIds[5]);
    
    // Check that the oldest ones are gone
    expect(remainingIds).not.toContain(createdIds[0]);
    expect(remainingIds).not.toContain(createdIds[4]);
  });
});
