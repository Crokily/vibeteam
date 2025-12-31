import { EventEmitter } from 'events';
import { describe, expect, it } from 'vitest';

import { IAgentAdapter } from '../adapters/IAgentAdapter';
import { StandardHandlers } from '../core/automation/StandardHandlers';
import { AgentState } from './AgentState';
import { SessionManager } from './SessionManager';
import { WorkflowExecutor } from './WorkflowExecutor';
import { RunnerFactory, WorkflowDefinition } from './types';

class MockAdapter extends EventEmitter implements IAgentAdapter {
  readonly name: string;
  autoPolicy?: IAgentAdapter['autoPolicy'];

  constructor(name: string, autoPolicy?: IAgentAdapter['autoPolicy']) {
    super();
    this.name = name;
    this.autoPolicy = autoPolicy;
  }

  getLaunchConfig() {
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

const createExecutor = (
  runnerFactory: RunnerFactory,
  options: ConstructorParameters<typeof WorkflowExecutor>[1] = {},
) => {
  const sessionManager = SessionManager.create('test-goal');
  return new WorkflowExecutor(sessionManager, { ...options, runnerFactory });
};

const createWorkflow = (
  adapter: IAgentAdapter,
  pendingInputs?: string[],
): WorkflowDefinition => ({
  id: 'workflow',
  stages: [
    {
      id: 'stage-0',
      tasks: [
        {
          id: 'task-0',
          adapter,
          ...(pendingInputs ? { pendingInputs } : {}),
        },
      ],
    },
  ],
});

describe('WorkflowExecutor', () => {
  it('auto-approves interaction requests with policy handlers', async () => {
    const adapter = new MockAdapter('interaction', {
      handlers: [StandardHandlers.confirmYes, StandardHandlers.pressEnter],
    });
    const runner = new FakeRunner();
    let interactionEvents = 0;
    const executor = createExecutor(() => runner, { autoApprove: true });
    executor.on('interactionNeeded', () => {
      interactionEvents += 1;
    });

    const runPromise = executor.executeWorkflow(
      createWorkflow(adapter, ['Build snake game']),
    );
    await nextTick();

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    adapter.emit('interaction_needed', { prompt: '[y/N]' });

    expect(runner.sent).toEqual(['Build snake game\r', 'y\r']);
    expect(interactionEvents).toBe(0);

    runner.emitExit();
    await runPromise;
  });

  it('validates submitInteraction when not waiting', async () => {
    const adapter = new MockAdapter('interaction', {
      handlers: [StandardHandlers.confirmYes, StandardHandlers.pressEnter],
    });
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow(adapter, ['Check interaction']),
    );
    await nextTick();
    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });

    expect(() => executor.submitInteraction('task-0', 'yes')).toThrow(
      'not waiting',
    );

    adapter.emit('interactionNeeded', { prompt: 'continue?' });
    expect(executor.getSession().taskStatus['task-0']).toBe('WAITING_FOR_USER');

    executor.submitInteraction('task-0', 'yes');
    expect(runner.sent.slice(-1)).toEqual(['yes\r']);

    runner.emitExit();
    await runPromise;
  });

  it('falls back to manual interaction when no policy handler matches', async () => {
    const adapter = new MockAdapter('manual', { handlers: [() => null] });
    const runner = new FakeRunner();
    let interactionEvents = 0;
    const executor = createExecutor(() => runner, { autoApprove: true });

    executor.on('interactionNeeded', () => {
      interactionEvents += 1;
    });

    const runPromise = executor.executeWorkflow(
      createWorkflow(adapter, ['Build snake game']),
    );
    await nextTick();

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    adapter.emit('interaction_needed', { prompt: 'unknown prompt' });

    expect(interactionEvents).toBe(1);
    expect(executor.getSession().taskStatus['task-0']).toBe('WAITING_FOR_USER');
    expect(runner.sent).toEqual(['Build snake game\r']);

    runner.emitExit();
    await runPromise;
  });

  it('injects auto policy args when auto-approve is enabled', async () => {
    const adapter = new MockAdapter('auto-args', {
      injectArgs: ['--approval-mode', 'yolo'],
    });
    const runner = new FakeRunner();
    let receivedConfig: ReturnType<IAgentAdapter['getLaunchConfig']> | undefined;
    const executor = createExecutor(
      (_adapter, _taskId, launchConfig) => {
        receivedConfig = launchConfig;
        return runner;
      },
      { autoApprove: true },
    );

    const runPromise = executor.executeWorkflow(createWorkflow(adapter));
    await nextTick();

    expect(receivedConfig?.args).toEqual([
      '-e',
      'process.exit(0)',
      '--approval-mode',
      'yolo',
    ]);

    runner.emitExit();
    await runPromise;
  });

  it('executes queued inputs on idle transitions', async () => {
    const adapter = new MockAdapter('queue');
    const runner = new FakeRunner();
    const executor = createExecutor(() => runner);

    const runPromise = executor.executeWorkflow(
      createWorkflow(adapter, ['first', 'second']),
    );
    await nextTick();

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    expect(runner.sent).toEqual(['first\r']);

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    expect(runner.sent).toEqual(['first\r', 'second\r']);

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    await runPromise;

    expect(executor.getSession().taskStatus['task-0']).toBe('DONE');
    expect(runner.stopped).toBe(true);
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

  it('executes tasks in parallel within a stage', async () => {
    const adapter = new MockAdapter('parallel');
    let activeCount = 0;
    let maxActive = 0;

    class TrackingRunner extends EventEmitter {
      start(): void {
        activeCount += 1;
        maxActive = Math.max(maxActive, activeCount);
        setTimeout(() => {
          activeCount -= 1;
          this.emit('event', { type: 'exit', code: 0, signal: null });
        }, 20);
      }
      stop(): void {}
      send(): void {}
    }

    const executor = createExecutor(() => new TrackingRunner());

    const workflow: WorkflowDefinition = {
      id: 'parallel-flow',
      stages: [
        {
          id: 's1',
          tasks: [
            { id: 'p1', adapter },
            { id: 'p2', adapter },
            { id: 'p3', adapter },
          ],
        },
      ],
    };

    await executor.executeWorkflow(workflow);
    expect(maxActive).toBe(3);
  });
});
