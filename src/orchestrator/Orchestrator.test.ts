import { EventEmitter } from 'events';
import { describe, expect, it } from 'vitest';

import { IAgentAdapter } from '../adapters/IAgentAdapter';
import { AgentState } from './AgentState';
import { Orchestrator } from './Orchestrator';

class InteractionAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'interaction-mock';

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

describe('Orchestrator', () => {
  it('auto-approves interaction requests', () => {
    const adapter = new InteractionAdapter();
    const runner = new FakeRunner();
    const orchestrator = new Orchestrator({
      autoApprove: true,
      runnerFactory: () => runner,
    });
    const states: AgentState[] = [];

    orchestrator.on('stateChange', (event) => {
      states.push(event.to);
    });

    orchestrator.connect(adapter);
    orchestrator.startTask('Build snake game');
    adapter.emit('interaction_needed', { prompt: '[y/N]' });

    expect(runner.sent).toEqual(['Build snake game\r', 'y\r']);
    expect(states.slice(-3)).toEqual([
      AgentState.RUNNING,
      AgentState.AWAITING_INTERACTION,
      AgentState.RUNNING,
    ]);
  });

  it('cleans up on exit and allows reconnect', () => {
    const adapter = new InteractionAdapter();
    const runners: FakeRunner[] = [];
    const orchestrator = new Orchestrator({
      runnerFactory: () => {
        const runner = new FakeRunner();
        runners.push(runner);
        return runner;
      },
    });

    orchestrator.connect(adapter);
    runners[0].emitExit();

    expect(orchestrator.getState()).toBe(AgentState.IDLE);
    expect(runners[0].stopped).toBe(true);
    expect(() => orchestrator.connect(adapter)).not.toThrow();
    expect(runners).toHaveLength(2);
  });

  it('disconnects and allows reconnect', () => {
    const adapter = new InteractionAdapter();
    const runners: FakeRunner[] = [];
    const orchestrator = new Orchestrator({
      runnerFactory: () => {
        const runner = new FakeRunner();
        runners.push(runner);
        return runner;
      },
    });

    orchestrator.connect(adapter);
    orchestrator.disconnect();

    expect(orchestrator.getState()).toBe(AgentState.IDLE);
    expect(runners[0].stopped).toBe(true);
    expect(() => orchestrator.connect(adapter)).not.toThrow();
    expect(runners).toHaveLength(2);
  });
});
