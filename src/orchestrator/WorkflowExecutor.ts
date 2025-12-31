import { EventEmitter } from 'events';

import { AgentLaunchConfig, IAgentAdapter } from '../adapters/IAgentAdapter';
import { AgentEvent } from '../core/AgentEvent';
import { AgentRunner } from '../core/AgentRunner';
import { InteractionContext } from '../core/automation/types';
import { AgentState } from './AgentState';
import { SessionManager } from './SessionManager';
import { TaskStatus, WorkflowSession } from './WorkflowSession';
import {
  AgentRunnerLike,
  OrchestratorAgentEvent,
  OrchestratorInteraction,
  OrchestratorTaskOutput,
  OrchestratorTaskStatusChange,
  RunnerFactory,
  WorkflowDefinition,
  WorkflowStage,
  WorkflowTask,
} from './types';

export type WorkflowExecutorOptions = {
  autoApprove?: boolean;
  autoApproveResponse?: string;
  runnerFactory?: RunnerFactory;
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

type RunnerContext = {
  runner: AgentRunnerLike;
  adapter: IAgentAdapter;
  adapterEmitter: AdapterEmitter | null;
  taskId: string;
  stageIndex: number;
  keepAlive: boolean;
  onRunnerEvent: (event: AgentEvent) => void;
  onInteractionNeeded: (payload?: unknown) => void;
  onAdapterStateChange: (...args: unknown[]) => void;
  resolve: () => void;
  reject: (error: Error) => void;
};

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

export class WorkflowExecutor extends EventEmitter {
  private readonly autoApprove: boolean;
  private readonly runnerFactory: RunnerFactory;
  private readonly sessionManager: SessionManager;

  private readonly activeRunners = new Map<string, RunnerContext>();
  private state: AgentState = AgentState.IDLE;

  constructor(sessionManager: SessionManager, options: WorkflowExecutorOptions = {}) {
    super();
    this.sessionManager = sessionManager;
    this.autoApprove = options.autoApprove ?? false;
    this.runnerFactory =
      options.runnerFactory ??
      ((adapter, _taskId, launchConfig) => new AgentRunner(adapter, launchConfig));
  }

  getState(): AgentState {
    return this.state;
  }

  getSession(): WorkflowSession {
    return this.sessionManager.getSession();
  }

  hasActiveRunners(): boolean {
    return this.activeRunners.size > 0;
  }

  executeWorkflow(workflow: WorkflowDefinition): Promise<WorkflowSession> {
    if (this.activeRunners.size > 0) {
      throw new Error('Orchestrator is already running a workflow.');
    }

    this.validateWorkflow(workflow);
    this.sessionManager.initializeWorkflow(workflow);
    this.persistSession();

    const session = this.sessionManager.getSession();
    const stages = workflow.stages;
    const startIndex = Math.min(
      Math.max(session.currentStageIndex, 0),
      stages.length,
    );

    if (startIndex >= stages.length) {
      this.setState(AgentState.IDLE);
      return Promise.resolve(session);
    }

    const run = async () => {
      for (let stageIndex = startIndex; stageIndex < stages.length; stageIndex += 1) {
        this.sessionManager.setCurrentStageIndex(stageIndex);
        this.persistSession();

        await this.executeStage(stages[stageIndex], stageIndex);

        this.sessionManager.setCurrentStageIndex(stageIndex + 1);
        this.persistSession();
      }

      this.setState(AgentState.IDLE);
      return this.sessionManager.getSession();
    };

    return run();
  }

  submitInteraction(taskId: string, input: string): void {
    const session = this.sessionManager.getSession();
    const status = session.taskStatus[taskId];
    if (status !== 'WAITING_FOR_USER') {
      throw new Error(`Task "${taskId}" is not waiting for user input.`);
    }

    this.sendInput(taskId, input);
    this.updateTaskStatus(taskId, 'RUNNING');
  }

  stopAll(): void {
    this.stopAllRunners();
  }

  private executeStage(stage: WorkflowStage, stageIndex: number): Promise<void> {
    const session = this.sessionManager.getSession();
    const runnableTasks = stage.tasks.filter(
      (task) => session.taskStatus[task.id] !== 'DONE',
    );

    if (runnableTasks.length === 0) {
      return Promise.resolve();
    }

    this.setState(AgentState.RUNNING);

    const executions = runnableTasks.map((task) =>
      this.executeTask(task, stageIndex),
    );

    return Promise.all(executions)
      .then(() => undefined)
      .catch((error) => {
        this.setState(AgentState.ERROR);
        this.stopAllRunners();
        throw error;
      });
  }

  private executeTask(task: WorkflowTask, stageIndex: number): Promise<void> {
    if (this.activeRunners.has(task.id)) {
      throw new Error(`Task "${task.id}" is already running.`);
    }

    const launchConfig = this.resolveLaunchConfig(task.adapter);
    const runner = this.runnerFactory(task.adapter, task.id, launchConfig);
    const adapterEmitter = asEmitter(task.adapter);
    const session = this.sessionManager.getSession();
    const keepAlive = session.keepAlive[task.id] ?? task.keepAlive ?? false;

    return new Promise((resolve, reject) => {
      const context: RunnerContext = {
        runner,
        adapter: task.adapter,
        adapterEmitter,
        taskId: task.id,
        stageIndex,
        keepAlive,
        onRunnerEvent: (event) => this.handleRunnerEvent(task.id, stageIndex, event),
        onInteractionNeeded: (payload) =>
          this.handleInteractionNeeded(task.id, payload),
        onAdapterStateChange: (...args) =>
          this.handleAdapterStateChange(task.id, ...args),
        resolve,
        reject,
      };

      this.activeRunners.set(task.id, context);
      runner.on('event', context.onRunnerEvent);

      if (adapterEmitter) {
        this.attachAdapterListeners(
          adapterEmitter,
          context.onInteractionNeeded,
          context.onAdapterStateChange,
        );
      }

      try {
        runner.start();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.cleanupRunner(task.id);
        reject(err);
        return;
      }

      this.updateTaskStatus(task.id, 'RUNNING');
    });
  }

  private resolveLaunchConfig(adapter: IAgentAdapter): AgentLaunchConfig {
    const config = adapter.getLaunchConfig();
    if (!this.autoApprove) {
      return config;
    }

    const injectArgs = adapter.autoPolicy?.injectArgs;
    if (!injectArgs || injectArgs.length === 0) {
      return config;
    }

    const mergedArgs = [...(config.args ?? []), ...injectArgs];
    return { ...config, args: mergedArgs };
  }

  private sendInput(taskId: string, input: string): void {
    const context = this.activeRunners.get(taskId);
    if (!context) {
      throw new Error(`Task "${taskId}" is not active.`);
    }

    const normalized = normalizeInput(input);
    context.runner.send(normalized);
    this.sessionManager.addHistory(input, taskId);
  }

  private updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.sessionManager.updateTaskStatus(taskId, status);
    this.persistSession();

    const payload: OrchestratorTaskStatusChange = {
      taskId,
      status,
      session: this.sessionManager.getSession(),
    };
    this.emit('taskStatusChange', payload);
    this.recalculateState();
  }

  private handleRunnerEvent(taskId: string, stageIndex: number, event: AgentEvent): void {
    const session = this.sessionManager.getSession();
    const payload: OrchestratorAgentEvent = {
      taskId,
      stageIndex,
      session,
      event,
    };

    this.emit('agentEvent', payload);

    if (event.type === 'data') {
      this.sessionManager.appendLog(taskId, event.clean);
      const outputEvent: OrchestratorTaskOutput = {
        taskId,
        stageIndex,
        session,
        raw: event.raw,
        clean: event.clean,
      };
      this.emit('taskOutput', outputEvent);
      return;
    }

    const context = this.activeRunners.get(taskId);
    if (!context) {
      return;
    }

    if (event.type === 'error') {
      this.updateTaskStatus(taskId, 'ERROR');
      this.cleanupRunner(taskId);
      context.reject(event.error);
      return;
    }

    if (event.type === 'exit') {
      this.updateTaskStatus(taskId, 'DONE');
      this.cleanupRunner(taskId);
      context.resolve();
    }
  }

  private handleIdleState(taskId: string): void {
    const session = this.sessionManager.getSession();
    const context = this.activeRunners.get(taskId);
    if (!context) {
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(session.pendingInputs, taskId)) {
      session.pendingInputs[taskId] = [];
    }

    const pendingInputs = session.pendingInputs[taskId];

    if (pendingInputs.length === 0) {
      this.updateTaskStatus(taskId, 'DONE');
      this.cleanupRunner(taskId);
      context.resolve();
      return;
    }

    const nextInput = pendingInputs[0];
    if (nextInput === undefined) {
      return;
    }

    this.sendInput(taskId, nextInput);
    pendingInputs.shift();
    this.persistSession();

    if (session.taskStatus[taskId] !== 'RUNNING') {
      this.updateTaskStatus(taskId, 'RUNNING');
    }
  }

  private handleAdapterStateChange(taskId: string, ...args: unknown[]): void {
    const event = args[0] as AdapterStateChange;
    const stateName = event?.to?.name?.toLowerCase();
    if (!stateName) {
      return;
    }

    if (stateName.includes('interaction_idle')) {
      this.handleIdleState(taskId);
      return;
    }

    if (stateName.includes('interaction')) {
      this.handleInteractionNeeded(taskId, { source: 'stateChange', state: event.to });
    }
  }

  private handleInteractionNeeded(taskId: string, payload?: unknown): void {
    const autoAction = this.resolveAutoAction(taskId, payload);
    if (autoAction !== null) {
      try {
        this.sendInput(taskId, autoAction);
        this.updateTaskStatus(taskId, 'RUNNING');
      } catch (error) {
        this.emit('error', error);
      }
      return;
    }

    this.updateTaskStatus(taskId, 'WAITING_FOR_USER');

    const event: OrchestratorInteraction = {
      session: this.sessionManager.getSession(),
      taskId,
      payload,
    };
    this.emit('interactionNeeded', event);
  }

  private resolveAutoAction(taskId: string, payload?: unknown): string | null {
    if (!this.autoApprove) {
      return null;
    }

    const context = this.activeRunners.get(taskId);
    if (!context) {
      return null;
    }

    const handlers = context.adapter.autoPolicy?.handlers;
    if (!handlers || handlers.length === 0) {
      return null;
    }

    const interactionContext: InteractionContext = {
      taskId,
      adapter: context.adapter,
      payload,
    };

    for (const handler of handlers) {
      try {
        const action = handler(interactionContext);
        if (action !== null && action !== undefined) {
          return action;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.emit('error', err);
      }
    }

    return null;
  }

  private attachAdapterListeners(
    emitter: AdapterEmitter,
    onInteractionNeeded: (payload?: unknown) => void,
    onAdapterStateChange: (...args: unknown[]) => void,
  ): void {
    const handlers: Record<
      AdapterEmitterEvents,
      (...args: unknown[]) => void
    > = {
      interaction_needed: onInteractionNeeded,
      interactionNeeded: onInteractionNeeded,
      stateChange: onAdapterStateChange,
    };

    for (const [event, handler] of Object.entries(handlers) as Array<
      [AdapterEmitterEvents, (...args: unknown[]) => void]
    >) {
      emitter.on(event, handler);
    }
  }

  private detachAdapterListeners(
    emitter: AdapterEmitter,
    onInteractionNeeded: (payload?: unknown) => void,
    onAdapterStateChange: (...args: unknown[]) => void,
  ): void {
    if (!emitter.off) {
      return;
    }

    const handlers: Record<
      AdapterEmitterEvents,
      (...args: unknown[]) => void
    > = {
      interaction_needed: onInteractionNeeded,
      interactionNeeded: onInteractionNeeded,
      stateChange: onAdapterStateChange,
    };

    for (const [event, handler] of Object.entries(handlers) as Array<
      [AdapterEmitterEvents, (...args: unknown[]) => void]
    >) {
      emitter.off(event, handler);
    }
  }

  private cleanupRunner(taskId: string): void {
    const context = this.activeRunners.get(taskId);
    if (!context) {
      return;
    }

    if (context.runner.off) {
      context.runner.off('event', context.onRunnerEvent);
    }

    if (context.adapterEmitter) {
      this.detachAdapterListeners(
        context.adapterEmitter,
        context.onInteractionNeeded,
        context.onAdapterStateChange,
      );
    }

    if (!context.keepAlive) {
      context.runner.stop();
    }
    this.activeRunners.delete(taskId);
    this.recalculateState();
  }

  private stopAllRunners(): void {
    for (const taskId of Array.from(this.activeRunners.keys())) {
      this.cleanupRunner(taskId);
    }
  }

  private recalculateState(): void {
    if (this.activeRunners.size === 0) {
      this.setState(AgentState.IDLE);
      return;
    }

    const session = this.sessionManager.getSession();
    const activeStatuses = Array.from(this.activeRunners.keys())
      .map((taskId) => session.taskStatus[taskId])
      .filter((status): status is TaskStatus => !!status);

    if (activeStatuses.includes('ERROR')) {
      this.setState(AgentState.ERROR);
      return;
    }

    if (activeStatuses.includes('WAITING_FOR_USER')) {
      this.setState(AgentState.AWAITING_INTERACTION);
      return;
    }

    if (activeStatuses.includes('RUNNING')) {
      this.setState(AgentState.RUNNING);
      return;
    }

    this.setState(AgentState.IDLE);
  }

  private setState(next: AgentState): void {
    if (this.state === next) {
      return;
    }

    const previous = this.state;
    this.state = next;
    const payload = {
      from: previous,
      to: next,
      session: this.sessionManager.getSession(),
    };
    this.emit('stateChange', payload);
  }

  private persistSession(): void {
    try {
      this.sessionManager.persist();
    } catch (error) {
      this.emit('error', error);
    }
  }

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.stages || workflow.stages.length === 0) {
      throw new Error('Workflow must contain at least one stage.');
    }

    const seenTaskIds = new Set<string>();

    for (const stage of workflow.stages) {
      if (!stage.tasks || stage.tasks.length === 0) {
        throw new Error(`Stage "${stage.id}" must contain at least one task.`);
      }

      for (const task of stage.tasks) {
        if (!task.id || !task.id.trim()) {
          throw new Error('Workflow task is missing an id.');
        }
        if (task.pendingInputs !== undefined) {
          if (!Array.isArray(task.pendingInputs)) {
            throw new Error(
              `Workflow task "${task.id}" pendingInputs must be an array.`,
            );
          }
          for (const input of task.pendingInputs) {
            if (typeof input !== 'string') {
              throw new Error(
                `Workflow task "${task.id}" pendingInputs must be strings.`,
              );
            }
          }
        }
        if (task.keepAlive !== undefined && typeof task.keepAlive !== 'boolean') {
          throw new Error(
            `Workflow task "${task.id}" keepAlive must be a boolean.`,
          );
        }
        if (seenTaskIds.has(task.id)) {
          throw new Error(`Workflow task id "${task.id}" must be unique.`);
        }
        seenTaskIds.add(task.id);
      }
    }
  }
}
