import { EventEmitter } from 'events';
import { describe, expect, it } from 'vitest';

import { IAgentAdapter } from '../../adapters/IAgentAdapter';
import { AgentState } from '../state/AgentState';
import { SessionManager } from '../state/SessionManager';
import { WorkflowExecutor } from './WorkflowExecutor';
import { ExecutionMode, RunnerFactory, WorkflowDefinition } from '../types';

class MockAdapter extends EventEmitter implements IAgentAdapter {
  readonly name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  getLaunchConfig() {
    return {
      command: process.execPath,
      args: ['-e', 'process.exit(0)'],
    };
  }

  getHeadlessLaunchConfig(_prompt: string) {
    return this.getLaunchConfig();
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
  adapter: IAgentAdapter,
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
          adapter,
          ...(prompt ? { prompt } : {}),
          ...(executionMode ? { executionMode } : {}),
        },
      ],
    },
  ],
});

describe('WorkflowExecutor', () => {
  it('sends the initial prompt when ready output appears', async () => {
    const adapter = new MockAdapter('interaction');
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow(adapter, 'Build snake game', 'interactive'),
    );
    await nextTick();

    runner.emit('event', {
      type: 'data',
      raw: 'Ready for your command',
      clean: 'Ready for your command',
    });

    expect(runner.sent).toEqual(['Build snake game\r']);

    runner.emitExit();
    await runPromise;
  });

  it('validates submitInteraction when not waiting', async () => {
    const adapter = new MockAdapter('interaction');
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow(adapter, 'Check interaction', 'interactive'),
    );
    await nextTick();

    expect(() => executor.submitInteraction('task-0', 'yes')).toThrow(
      'not waiting',
    );

    runner.emit('event', {
      type: 'data',
      raw: 'Ready for your command',
      clean: 'Ready for your command',
    });
    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });

    expect(executor.getSession().taskStatus['task-0']).toBe('WAITING_FOR_USER');

    executor.submitInteraction('task-0', 'yes');
    expect(runner.sent.slice(-1)).toEqual(['yes\r']);

    runner.emitExit();
    await runPromise;
  });

  it('records prompts for headless tasks', async () => {
    const adapter = new MockAdapter('headless');
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow(adapter, 'Headless prompt', 'headless'),
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
    const adapter = new MockAdapter('sequential');
    const executor = createExecutor(() => new DelayedRunner(10));

    const workflow: WorkflowDefinition = {
      id: 'seq-flow',
      stages: [
        { id: 's1', tasks: [{ id: 't1', adapter }] },
        { id: 's2', tasks: [{ id: 't2', adapter }] },
      ],
    };

    const session = await executor.executeWorkflow(workflow);
    expect(session.currentStageIndex).toBe(2);
    expect(session.taskStatus['t1']).toBe('DONE');
    expect(session.taskStatus['t2']).toBe('DONE');
    expect(executor.getState()).toBe(AgentState.IDLE);
  });
});
