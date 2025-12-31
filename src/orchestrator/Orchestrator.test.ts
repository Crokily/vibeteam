import { EventEmitter } from 'events';
import { describe, expect, it } from 'vitest';

import { AgentLaunchConfig, IAgentAdapter } from '../adapters/IAgentAdapter';
import { StandardHandlers } from '../core/automation/StandardHandlers';
import { AgentState } from './AgentState';
import { Orchestrator, WorkflowDefinition } from './Orchestrator';

class InteractionAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'interaction-mock';
  autoPolicy = {
    handlers: [StandardHandlers.confirmYes, StandardHandlers.pressEnter],
  };

  constructor() {
    super();
  }

  getLaunchConfig() {
    return {
      command: process.execPath,
      args: ['-e', 'process.exit(0)'],
    };
  }
}

class MockAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'mock-adapter';

  constructor() {
    super();
  }

  getLaunchConfig() {
    return {
      command: process.execPath,
      args: ['-e', 'process.exit(0)'],
    };
  }
}

class AutoPolicyAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'auto-policy-mock';
  autoPolicy = {
    injectArgs: ['--approval-mode', 'yolo'],
  };

  constructor() {
    super();
  }

  getLaunchConfig() {
    return {
      command: process.execPath,
      args: ['-e', 'process.exit(0)'],
    };
  }
}

class ManualPolicyAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'manual-policy-mock';
  autoPolicy = {
    handlers: [() => null],
  };

  constructor() {
    super();
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

const nextTick = () => new Promise((resolve) => setImmediate(resolve));

describe('Orchestrator', () => {
  it('auto-approves interaction requests with policy handlers', async () => {
    const adapter = new InteractionAdapter();
    const runner = new FakeRunner();
    let interactionEvents = 0;
    const orchestrator = new Orchestrator({
      autoApprove: true,
      runnerFactory: () => runner,
    });
    orchestrator.on('interactionNeeded', () => {
      interactionEvents += 1;
    });

    const workflow: WorkflowDefinition = {
      id: 'workflow-auto-approve',
      stages: [
        {
          id: 'stage-0',
          tasks: [
            {
              id: 'task-0',
              adapter,
              pendingInputs: ['Build snake game'],
            },
          ],
        },
      ],
    };

    const runPromise = orchestrator.executeWorkflow(workflow);
    await nextTick();

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    adapter.emit('interaction_needed', { prompt: '[y/N]' });

    expect(runner.sent).toEqual(['Build snake game\r', 'y\r']);
    expect(interactionEvents).toBe(0);

    runner.emitExit();
    await runPromise;
  });

  it('allows sequential workflows after completion', async () => {
    const adapter = new InteractionAdapter();
    const runners: FakeRunner[] = [];
    const orchestrator = new Orchestrator({
      runnerFactory: () => {
        const runner = new FakeRunner();
        runners.push(runner);
        return runner;
      },
    });

    const workflow: WorkflowDefinition = {
      id: 'workflow-sequence',
      stages: [
        {
          id: 'stage-0',
          tasks: [
            {
              id: 'task-0',
              adapter,
              pendingInputs: ['Hello'],
            },
          ],
        },
      ],
    };

    const firstRun = orchestrator.executeWorkflow(workflow);
    await nextTick();
    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    runners[0].emitExit();
    await firstRun;

    const secondRun = orchestrator.executeWorkflow({
      ...workflow,
      id: 'workflow-sequence-2',
    });
    await nextTick();
    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    runners[1].emitExit();
    await secondRun;

    expect(orchestrator.getState()).toBe(AgentState.IDLE);
    expect(runners).toHaveLength(2);
  });

  it('validates submitInteraction when not waiting', async () => {
    const adapter = new InteractionAdapter();
    const runner = new FakeRunner();
    const orchestrator = new Orchestrator({
      runnerFactory: () => runner,
    });

    const workflow: WorkflowDefinition = {
      id: 'workflow-interaction',
      stages: [
        {
          id: 'stage-0',
          tasks: [
            {
              id: 'task-0',
              adapter,
              pendingInputs: ['Check interaction'],
            },
          ],
        },
      ],
    };

    const runPromise = orchestrator.executeWorkflow(workflow);
    await nextTick();
    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });

    expect(() => orchestrator.submitInteraction('task-0', 'yes')).toThrow(
      'not waiting',
    );

    adapter.emit('interactionNeeded', { prompt: 'continue?' });
    expect(orchestrator.getSession()?.taskStatus['task-0']).toBe(
      'WAITING_FOR_USER',
    );

    orchestrator.submitInteraction('task-0', 'yes');
    expect(runner.sent.slice(-1)).toEqual(['yes\r']);

    runner.emitExit();
    await runPromise;
  });

  it('falls back to manual interaction when no policy handler matches', async () => {
    const adapter = new ManualPolicyAdapter();
    const runner = new FakeRunner();
    let interactionEvents = 0;
    const orchestrator = new Orchestrator({
      autoApprove: true,
      runnerFactory: () => runner,
    });

    orchestrator.on('interactionNeeded', () => {
      interactionEvents += 1;
    });

    const workflow: WorkflowDefinition = {
      id: 'workflow-manual-fallback',
      stages: [
        {
          id: 'stage-0',
          tasks: [
            {
              id: 'task-0',
              adapter,
              pendingInputs: ['Build snake game'],
            },
          ],
        },
      ],
    };

    const runPromise = orchestrator.executeWorkflow(workflow);
    await nextTick();

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    adapter.emit('interaction_needed', { prompt: 'unknown prompt' });

    expect(interactionEvents).toBe(1);
    expect(orchestrator.getSession()?.taskStatus['task-0']).toBe(
      'WAITING_FOR_USER',
    );
    expect(runner.sent).toEqual(['Build snake game\r']);

    runner.emitExit();
    await runPromise;
  });

  it('injects auto policy args when auto-approve is enabled', async () => {
    const adapter = new AutoPolicyAdapter();
    const runner = new FakeRunner();
    let receivedConfig: AgentLaunchConfig | undefined;
    const orchestrator = new Orchestrator({
      autoApprove: true,
      runnerFactory: (_adapter, _taskId, launchConfig) => {
        receivedConfig = launchConfig;
        return runner;
      },
    });

    const workflow: WorkflowDefinition = {
      id: 'workflow-auto-args',
      stages: [
        {
          id: 'stage-0',
          tasks: [
            {
              id: 'task-0',
              adapter,
            },
          ],
        },
      ],
    };

    const runPromise = orchestrator.executeWorkflow(workflow);
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
    const adapter = new MockAdapter();
    const runner = new FakeRunner();
    const orchestrator = new Orchestrator({
      runnerFactory: () => runner,
    });

    const workflow: WorkflowDefinition = {
      id: 'workflow-idle-queue',
      stages: [
        {
          id: 'stage-0',
          tasks: [
            {
              id: 'task-0',
              adapter,
              pendingInputs: ['first', 'second'],
            },
          ],
        },
      ],
    };

    const runPromise = orchestrator.executeWorkflow(workflow);
    await nextTick();

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    expect(runner.sent).toEqual(['first\r']);

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    expect(runner.sent).toEqual(['first\r', 'second\r']);

    adapter.emit('stateChange', { to: { name: 'interaction_idle' } });
    await runPromise;

    expect(orchestrator.getSession()?.taskStatus['task-0']).toBe('DONE');
    expect(runner.stopped).toBe(true);
  });
});
