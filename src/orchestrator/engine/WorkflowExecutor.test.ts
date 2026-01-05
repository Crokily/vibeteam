import { EventEmitter } from 'events';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ExecutionMode, IAgentAdapter } from '../../adapters/IAgentAdapter';
import { adapterRegistry } from '../../adapters/registry';
import { AgentState } from '../state/AgentState';
import { SessionManager } from '../state/SessionManager';
import { WorkflowExecutor } from './WorkflowExecutor';
import { RunnerFactory, WorkflowDefinition } from '../types';

type MockAdapterOptions = {
  name?: string;
};

let lastAdapter: MockAdapter | null = null;

class MockAdapter extends EventEmitter implements IAgentAdapter {
  readonly name: string;
  lastLaunchMode?: ExecutionMode;
  lastLaunchPrompt?: string;
  lastLaunchExtraArgs?: string[];

  constructor(options: MockAdapterOptions = {}) {
    super();
    this.name = options.name ?? 'mock';
    lastAdapter = this;
  }

  getLaunchConfig(
    mode: ExecutionMode,
    prompt?: string,
    extraArgs?: string[],
  ) {
    this.lastLaunchMode = mode;
    this.lastLaunchPrompt = prompt;
    this.lastLaunchExtraArgs = extraArgs;
    return {
      command: process.execPath,
      args: ['-e', 'process.exit(0)'],
    };
  }
}

class FakeRunner extends EventEmitter {
  readonly sent: string[] = [];
  stopped = false;

  start(): void {}

  stop(): void {
    this.stopped = true;
  }

  send(input: string): void {
    this.sent.push(input);
  }

  emitExit(): void {
    this.emit('event', { type: 'exit', code: 0, signal: null });
  }
}

class DelayedRunner extends EventEmitter {
  constructor(private readonly delay = 0) {
    super();
  }

  start(): void {
    setTimeout(() => {
      this.emit('event', { type: 'exit', code: 0, signal: null });
    }, this.delay);
  }

  stop(): void {}
  send(): void {}
}

const nextTick = () => new Promise((resolve) => setImmediate(resolve));

const createExecutor = (runnerFactory: RunnerFactory) => {
  const sessionManager = SessionManager.create('test-goal');
  return new WorkflowExecutor(sessionManager, { runnerFactory });
};

const createWorkflow = (
  adapterType: string,
  prompt?: string,
  executionMode?: ExecutionMode,
): WorkflowDefinition => ({
  id: 'workflow',
  stages: [
    {
      id: 'stage-0',
      tasks: [
        {
          id: 'task-0',
          adapter: adapterType,
          ...(prompt ? { prompt } : {}),
          ...(executionMode ? { executionMode } : {}),
        },
      ],
    },
  ],
});

describe('WorkflowExecutor', () => {
  beforeAll(() => {
    adapterRegistry.register('mock', MockAdapter);
  });

  beforeEach(() => {
    lastAdapter = null;
  });

  it('passes prompt via getLaunchConfig (not stdin)', async () => {
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow('mock', 'Build snake game', 'interactive'),
    );
    await nextTick();

    if (!lastAdapter) {
      throw new Error('Expected adapter instance to be created.');
    }

    // Prompt is passed to adapter.getLaunchConfig, not sent via stdin
    expect(lastAdapter.lastLaunchMode).toBe('interactive');
    expect(lastAdapter.lastLaunchPrompt).toBe('Build snake game');
    expect(runner.sent).toEqual([]); // No stdin writes for initial prompt

    runner.emitExit();
    await runPromise;
  });

  it('allows submitInteraction for interactive tasks while running', async () => {
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow('mock', 'Check interaction', 'interactive'),
    );
    await nextTick();

    if (!lastAdapter) {
      throw new Error('Expected adapter instance to be created.');
    }

    executor.submitInteraction('task-0', 'yes');
    expect(runner.sent.slice(-1)).toEqual(['yes']);

    runner.emit('event', {
      type: 'data',
      raw: 'Ready for your command',
      clean: 'Ready for your command',
    });
    lastAdapter.emit('stateChange', { to: { name: 'interaction_idle' } });

    expect(executor.getSession().taskStatus['task-0']).toBe('WAITING_FOR_USER');

    executor.submitInteraction('task-0', 'yes\r');
    expect(runner.sent.slice(-1)).toEqual(['yes\r']);

    runner.emitExit();
    await runPromise;
  });

  it('allows manual completion for interactive tasks', async () => {
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow('mock', 'Manual completion', 'interactive'),
    );
    await nextTick();

    executor.completeTask('task-0');
    await runPromise;

    expect(runner.stopped).toBe(true);
    expect(executor.getSession().taskStatus['task-0']).toBe('DONE');
  });

  it('throws when manually completing non-active tasks', async () => {
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow('mock', 'Manual completion', 'interactive'),
    );
    await nextTick();

    expect(() => executor.completeTask('missing-task')).toThrow('not active');

    runner.emitExit();
    await runPromise;

    expect(() => executor.completeTask('task-0')).toThrow('not active');
  });

  it('records prompts for headless tasks', async () => {
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow('mock', 'Headless prompt', 'headless'),
    );
    await nextTick();

    expect(
      executor
        .getSession()
        .history.some((entry) => entry.includes('Headless prompt')),
    ).toBe(true);
    expect(runner.sent).toEqual([]);

    runner.emitExit();
    await runPromise;
  });

  it('executes stages sequentially', async () => {
    const executor = createExecutor(() => new DelayedRunner(10));

    const workflow: WorkflowDefinition = {
      id: 'seq-flow',
      stages: [
        { id: 's1', tasks: [{ id: 't1', adapter: 'mock' }] },
        { id: 's2', tasks: [{ id: 't2', adapter: 'mock' }] },
      ],
    };

    const session = await executor.executeWorkflow(workflow);
    expect(session.currentStageIndex).toBe(2);
    expect(session.taskStatus['t1']).toBe('DONE');
    expect(session.taskStatus['t2']).toBe('DONE');
    expect(executor.getState()).toBe(AgentState.IDLE);
  });
});
