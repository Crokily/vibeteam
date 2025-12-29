import { EventEmitter } from 'events';
import { describe, expect, it } from 'vitest';

import { IAgentAdapter } from '../adapters/IAgentAdapter';
import { AgentState } from './AgentState';
import { Orchestrator, WorkflowDefinition } from './Orchestrator';

class InteractionAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'interaction-mock';

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
  it('auto-approves interaction requests', async () => {
    const adapter = new InteractionAdapter();
    const runner = new FakeRunner();
    const orchestrator = new Orchestrator({
      autoApprove: true,
      runnerFactory: () => runner,
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
              input: 'Build snake game',
            },
          ],
        },
      ],
    };

    const runPromise = orchestrator.executeWorkflow(workflow);
    await nextTick();

    adapter.emit('interaction_needed', { prompt: '[y/N]' });

    expect(runner.sent).toEqual(['Build snake game\r', 'y\r']);

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
              input: 'Hello',
            },
          ],
        },
      ],
    };

    const firstRun = orchestrator.executeWorkflow(workflow);
    await nextTick();
    runners[0].emitExit();
    await firstRun;

    const secondRun = orchestrator.executeWorkflow({
      ...workflow,
      id: 'workflow-sequence-2',
    });
    await nextTick();
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
              input: 'Check interaction',
            },
          ],
        },
      ],
    };

    const runPromise = orchestrator.executeWorkflow(workflow);
    await nextTick();

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
});
