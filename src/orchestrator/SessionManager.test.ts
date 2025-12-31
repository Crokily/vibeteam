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
    manager.setPendingInputs('task-1', ['step-1']);
    manager.setKeepAlive('task-1', true);
    manager.persist();

    const loaded = SessionManager.load(manager.getSession().id, { baseDir: TEST_DIR });
    const session = loaded.getSession();

    expect(session.id).toBe(manager.getSession().id);
    expect(session.goal).toBe('test-goal');
    expect(session.taskStatus['task-1']).toBe('RUNNING');
    expect(session.pendingInputs['task-1']).toEqual(['step-1']);
    expect(session.keepAlive['task-1']).toBe(true);
  });
});
