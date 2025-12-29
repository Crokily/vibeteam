import { EventEmitter } from 'events';

import { IAgentAdapter } from '../adapters/IAgentAdapter';
import { AgentEvent } from '../core/AgentEvent';
import { AgentRunner } from '../core/AgentRunner';
import { AgentState } from './AgentState';
import { WorkflowSession } from './WorkflowSession';

export type OrchestratorOptions = {
  autoApprove?: boolean;
  autoApproveResponse?: string;
  runnerFactory?: (adapter: IAgentAdapter) => AgentRunnerLike;
};

export type OrchestratorStateChange = {
  from: AgentState;
  to: AgentState;
  session: WorkflowSession | null;
};

export type OrchestratorInteraction = {
  session: WorkflowSession | null;
  payload?: unknown;
};

type AgentRunnerLike = {
  start(): void;
  stop(): void;
  send(input: string): void;
  on(event: 'event', listener: (event: AgentEvent) => void): void;
  off?(event: 'event', listener: (event: AgentEvent) => void): void;
};

type AdapterEmitter = {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off?(event: string, listener: (...args: unknown[]) => void): void;
};

type AdapterStateChange = {
  to?: {
    name?: string;
  };
};

type AdapterEmitterEvents = 'interaction_needed' | 'interactionNeeded' | 'stateChange';

const asEmitter = (adapter: IAgentAdapter): AdapterEmitter | null => {
  const candidate = adapter as unknown as AdapterEmitter;
  if (candidate && typeof candidate.on === 'function') {
    return candidate;
  }
  return null;
};

const normalizeInput = (input: string): string => {
  if (input.endsWith('\n') || input.endsWith('\r')) {
    return input;
  }
  return `${input}\r`;
};

export class Orchestrator extends EventEmitter {
  private readonly autoApprove: boolean;
  private readonly autoApproveResponse: string;
  private readonly runnerFactory: (adapter: IAgentAdapter) => AgentRunnerLike;

  private runner: AgentRunnerLike | null = null;
  private adapterEmitter: AdapterEmitter | null = null;
  private session: WorkflowSession | null = null;
  private state: AgentState = AgentState.IDLE;

  constructor(options: OrchestratorOptions = {}) {
    super();
    this.autoApprove = options.autoApprove ?? false;
    this.autoApproveResponse = options.autoApproveResponse ?? 'y';
    this.runnerFactory = options.runnerFactory ?? ((adapter) => new AgentRunner(adapter));
  }

  getState(): AgentState {
    return this.state;
  }

  getSession(): WorkflowSession | null {
    return this.session;
  }

  connect(adapter: IAgentAdapter): void {
    if (this.runner) {
      throw new Error('Orchestrator is already connected.');
    }

    this.runner = this.runnerFactory(adapter);
    this.runner.on('event', this.handleRunnerEvent);

    this.adapterEmitter = asEmitter(adapter);
    if (this.adapterEmitter) {
      this.attachAdapterListeners(this.adapterEmitter);
    }

    try {
      this.runner.start();
    } catch (error) {
      this.cleanupRunner(AgentState.ERROR);
      throw error;
    }

    this.setState(AgentState.IDLE);
  }

  disconnect(): void {
    if (!this.runner && !this.adapterEmitter) {
      return;
    }

    this.cleanupRunner(AgentState.IDLE);
  }

  startTask(goal: string): void {
    if (!this.runner) {
      throw new Error('Orchestrator is not connected.');
    }

    if (!goal.trim()) {
      throw new Error('Task goal is required.');
    }

    this.session = new WorkflowSession(goal);
    this.setState(AgentState.RUNNING);
    this.sendInput(goal);
  }

  submitInteraction(input: string): void {
    this.sendInput(input);
    this.setState(AgentState.RUNNING);
  }

  private sendInput(input: string): void {
    if (!this.runner) {
      throw new Error('Orchestrator is not connected.');
    }

    const normalized = normalizeInput(input);
    this.runner.send(normalized);
    this.session?.addHistory(input);
  }

  private setState(next: AgentState): void {
    if (this.state === next) {
      return;
    }

    const previous = this.state;
    this.state = next;
    const payload: OrchestratorStateChange = {
      from: previous,
      to: next,
      session: this.session,
    };
    this.emit('stateChange', payload);
  }

  private handleRunnerEvent = (event: AgentEvent): void => {
    this.emit('agentEvent', event);

    if (event.type === 'error') {
      this.cleanupRunner(AgentState.ERROR);
      return;
    }

    if (event.type === 'exit') {
      this.cleanupRunner(AgentState.IDLE);
    }
  };

  private handleAdapterStateChange = (...args: unknown[]): void => {
    const event = args[0] as AdapterStateChange;
    const stateName = event?.to?.name?.toLowerCase();
    if (!stateName) {
      return;
    }

    if (stateName.includes('interaction')) {
      this.handleInteractionNeeded({ source: 'stateChange', state: event.to });
      return;
    }

    if (stateName === 'idle') {
      this.setState(AgentState.IDLE);
    }
  };

  private handleInteractionNeeded = (payload?: unknown): void => {
    this.setState(AgentState.AWAITING_INTERACTION);
    const event: OrchestratorInteraction = {
      session: this.session,
      payload,
    };
    this.emit('interactionNeeded', event);

    if (!this.autoApprove) {
      return;
    }

    this.sendInput(this.autoApproveResponse);
    this.setState(AgentState.RUNNING);
  };

  private attachAdapterListeners(emitter: AdapterEmitter): void {
    const handlers: Record<AdapterEmitterEvents, (...args: unknown[]) => void> = {
      interaction_needed: this.handleInteractionNeeded,
      interactionNeeded: this.handleInteractionNeeded,
      stateChange: this.handleAdapterStateChange,
    };

    for (const [event, handler] of Object.entries(handlers) as Array<
      [AdapterEmitterEvents, (...args: unknown[]) => void]
    >) {
      emitter.on(event, handler);
    }
  }

  private detachAdapterListeners(emitter: AdapterEmitter): void {
    if (!emitter.off) {
      return;
    }

    const handlers: Record<AdapterEmitterEvents, (...args: unknown[]) => void> = {
      interaction_needed: this.handleInteractionNeeded,
      interactionNeeded: this.handleInteractionNeeded,
      stateChange: this.handleAdapterStateChange,
    };

    for (const [event, handler] of Object.entries(handlers) as Array<
      [AdapterEmitterEvents, (...args: unknown[]) => void]
    >) {
      emitter.off(event, handler);
    }
  }

  private cleanupRunner(nextState: AgentState): void {
    if (this.runner?.off) {
      this.runner.off('event', this.handleRunnerEvent);
    }

    if (this.runner) {
      this.runner.stop();
      this.runner = null;
    }

    if (this.adapterEmitter) {
      this.detachAdapterListeners(this.adapterEmitter);
      this.adapterEmitter = null;
    }

    this.setState(nextState);
  }
}
