import { EventEmitter } from 'events';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ExecutionMode, IAgentAdapter } from '../../adapters/IAgentAdapter';
import { adapterRegistry } from '../../adapters/registry';
import { SessionManager } from '../state/SessionManager';
import { TaskRunner } from './TaskRunner';

type TestAdapterOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  name?: string;
};

let lastAdapter: TestAdapter | null = null;

class TestAdapter extends EventEmitter implements IAgentAdapter {
  readonly name: string;
  readonly options: TestAdapterOptions;

  constructor(options: TestAdapterOptions = {}) {
    super();
    this.options = options;
    this.name = options.name ?? 'test';
    lastAdapter = this;
  }

  getLaunchConfig(
    _mode: ExecutionMode,
    _prompt?: string,
    _extraArgs?: string[],
  ) {
    return {
      command: process.execPath,
      args: ['-e', 'process.exit(0)'],
    };
  }
}

class FakeRunner extends EventEmitter {
  start(): void {
    setImmediate(() => {
      this.emit('event', { type: 'exit', code: 0, signal: null });
    });
  }

  stop(): void {}
  send(): void {}
}

describe('TaskRunner', () => {
  beforeAll(() => {
    adapterRegistry.register('test', TestAdapter);
  });

  beforeEach(() => {
    lastAdapter = null;
  });

  it('creates adapter instances using task config', async () => {
    const sessionManager = SessionManager.create('test-goal');
    const taskRunner = new TaskRunner(sessionManager, {
      runnerFactory: () => new FakeRunner(),
    });

    await taskRunner.runTask(
      {
        id: 'task-1',
        adapter: 'test',
        cwd: '/tmp',
        env: { TEST_VAR: 'yes' },
      },
      0,
    );

    expect(lastAdapter).not.toBeNull();
    expect(lastAdapter?.name).toBe('task-1');
    expect(lastAdapter?.options.cwd).toBe('/tmp');
    expect(lastAdapter?.options.env).toEqual({ TEST_VAR: 'yes' });
  });

  it('uses explicit task name when provided', async () => {
    const sessionManager = SessionManager.create('test-goal');
    const taskRunner = new TaskRunner(sessionManager, {
      runnerFactory: () => new FakeRunner(),
    });

    await taskRunner.runTask(
      {
        id: 'task-2',
        adapter: 'test',
        name: 'Custom Name',
      },
      0,
    );

    expect(lastAdapter?.name).toBe('Custom Name');
  });
});
