import { EventEmitter } from 'events';

import { IAgentAdapter } from '../adapters/IAgentAdapter';
import { AgentEvent } from '../core/AgentEvent';
import { AgentRunner } from '../core/AgentRunner';
import { AgentState } from './AgentState';
import { TaskStatus, WorkflowSession } from './WorkflowSession';

export type WorkflowTask = {
  id: string;
  adapter: IAgentAdapter;
  pendingInputs?: string[];
  keepAlive?: boolean;
};

export type WorkflowStage = {
  id: string;
  tasks: WorkflowTask[];
};

export type WorkflowDefinition = {
  id: string;
  goal?: string;
  stages: WorkflowStage[];
};

export type ExecuteWorkflowOptions = {
  sessionId?: string;
};

export type OrchestratorOptions = {
  autoApprove?: boolean;
  autoApproveResponse?: string;
  runnerFactory?: (adapter: IAgentAdapter, taskId?: string) => AgentRunnerLike;
};

export type OrchestratorStateChange = {
  from: AgentState;
  to: AgentState;
  session: WorkflowSession | null;
};

export type OrchestratorInteraction = {
  session: WorkflowSession | null;
  taskId: string;
  payload?: unknown;
};

export type OrchestratorAgentEvent = {
  taskId: string;
  stageIndex: number;
  session: WorkflowSession | null;
  event: AgentEvent;
};

export type OrchestratorTaskOutput = {
  taskId: string;
  stageIndex: number;
  session: WorkflowSession | null;
  raw: string;
  clean: string;
};

export type OrchestratorTaskStatusChange = {
  taskId: string;
  status: TaskStatus;
  session: WorkflowSession | null;
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

export class Orchestrator extends EventEmitter {
  private readonly autoApprove: boolean;
  private readonly autoApproveResponse: string;
  private readonly runnerFactory: (adapter: IAgentAdapter, taskId?: string) => AgentRunnerLike;

  private readonly activeRunners = new Map<string, RunnerContext>();
  private defaultAdapter: IAgentAdapter | null = null;
  private session: WorkflowSession | null = null;
  private state: AgentState = AgentState.IDLE;

  private signalHandlersInstalled = false;

  constructor(options: OrchestratorOptions = {}) {
    super();
    this.autoApprove = options.autoApprove ?? false;
    this.autoApproveResponse = options.autoApproveResponse ?? 'y';
    this.runnerFactory =
      options.runnerFactory ?? ((adapter) => new AgentRunner(adapter));
  }

  getState(): AgentState {
    return this.state;
  }

  getSession(): WorkflowSession | null {
    return this.session;
  }

  connect(adapter: IAgentAdapter): void {
    if (this.defaultAdapter) {
      throw new Error('Orchestrator is already connected.');
    }

    this.defaultAdapter = adapter;
  }

  disconnect(): void {
    this.stopAllRunners();
    this.defaultAdapter = null;
    this.setState(AgentState.IDLE);
  }

  async executeWorkflow(
    workflow: WorkflowDefinition,
    options: ExecuteWorkflowOptions = {},
  ): Promise<WorkflowSession> {
    if (this.activeRunners.size > 0) {
      throw new Error('Orchestrator is already running a workflow.');
    }

    this.validateWorkflow(workflow);

    const goal = workflow.goal ?? workflow.id;
    this.session = options.sessionId
      ? WorkflowSession.load(options.sessionId)
      : WorkflowSession.create(goal);

    this.initializeSession(workflow);
    this.persistSession();
    this.installSignalHandlers();

    const stages = workflow.stages;
    const startIndex = Math.min(
      Math.max(this.session.currentStageIndex, 0),
      stages.length,
    );

    if (startIndex >= stages.length) {
      this.setState(AgentState.IDLE);
      return this.session;
    }

    for (let stageIndex = startIndex; stageIndex < stages.length; stageIndex += 1) {
      this.session.currentStageIndex = stageIndex;
      this.persistSession();

      await this.executeStage(stages[stageIndex], stageIndex);

      this.session.currentStageIndex = stageIndex + 1;
      this.persistSession();
    }

    this.setState(AgentState.IDLE);
    return this.session;
  }

  startTask(goal: string): void {
    if (!this.defaultAdapter) {
      throw new Error('Orchestrator is not connected.');
    }

    if (!goal.trim()) {
      throw new Error('Task goal is required.');
    }

    const workflow: WorkflowDefinition = {
      id: `workflow-${Date.now()}`,
      goal,
      stages: [
        {
          id: 'stage-0',
          tasks: [
            {
              id: 'task-0',
              adapter: this.defaultAdapter,
              pendingInputs: [goal],
            },
          ],
        },
      ],
    };

    void this.executeWorkflow(workflow).catch((error) => {
      this.setState(AgentState.ERROR);
      this.emit('error', error);
    });
  }

  submitInteraction(taskId: string, input: string): void {
    if (!this.session) {
      throw new Error('No active session.');
    }

    const status = this.session.taskStatus[taskId];
    if (status !== 'WAITING_FOR_USER') {
      throw new Error(`Task "${taskId}" is not waiting for user input.`);
    }

    this.sendInput(taskId, input);
    this.updateTaskStatus(taskId, 'RUNNING');
  }

  private executeStage(stage: WorkflowStage, stageIndex: number): Promise<void> {
    const session = this.session;
    if (!session) {
      throw new Error('No active session.');
    }

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

    const runner = this.runnerFactory(task.adapter, task.id);
    const adapterEmitter = asEmitter(task.adapter);
    const keepAlive =
      this.session?.keepAlive[task.id] ?? task.keepAlive ?? false;

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

  private sendInput(taskId: string, input: string): void {
    const context = this.activeRunners.get(taskId);
    if (!context) {
      throw new Error(`Task "${taskId}" is not active.`);
    }

    const normalized = normalizeInput(input);
    context.runner.send(normalized);
    this.session?.addHistory(input, taskId);
  }

  private updateTaskStatus(taskId: string, status: TaskStatus): void {
    if (!this.session) {
      return;
    }

    this.session.ensureTask(taskId);
    this.session.updateTaskStatus(taskId, status);
    this.persistSession();

    const payload: OrchestratorTaskStatusChange = {
      taskId,
      status,
      session: this.session,
    };
    this.emit('taskStatusChange', payload);
    this.recalculateState();
  }

  private handleRunnerEvent(taskId: string, stageIndex: number, event: AgentEvent): void {
    const session = this.session;
    const payload: OrchestratorAgentEvent = {
      taskId,
      stageIndex,
      session,
      event,
    };

    this.emit('agentEvent', payload);

    if (event.type === 'data') {
      session?.appendLog(taskId, event.clean);
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
    const session = this.session;
    if (!session) {
      return;
    }

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
    this.updateTaskStatus(taskId, 'WAITING_FOR_USER');

    const event: OrchestratorInteraction = {
      session: this.session,
      taskId,
      payload,
    };
    this.emit('interactionNeeded', event);

    if (!this.autoApprove) {
      return;
    }

    try {
      this.submitInteraction(taskId, this.autoApproveResponse);
    } catch (error) {
      this.emit('error', error);
    }
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
    if (!this.session) {
      return;
    }

    if (this.activeRunners.size === 0) {
      this.setState(AgentState.IDLE);
      return;
    }

    const activeStatuses = Array.from(this.activeRunners.keys())
      .map((taskId) => this.session?.taskStatus[taskId])
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
    const payload: OrchestratorStateChange = {
      from: previous,
      to: next,
      session: this.session,
    };
    this.emit('stateChange', payload);
  }

  private initializeSession(workflow: WorkflowDefinition): void {
    if (!this.session) {
      return;
    }

    for (const stage of workflow.stages) {
      for (const task of stage.tasks) {
        const hasPendingInputs = Object.prototype.hasOwnProperty.call(
          this.session.pendingInputs,
          task.id,
        );
        const hasKeepAlive = Object.prototype.hasOwnProperty.call(
          this.session.keepAlive,
          task.id,
        );

        this.session.ensureTask(task.id);

        if (!hasPendingInputs) {
          this.session.pendingInputs[task.id] = Array.isArray(task.pendingInputs)
            ? [...task.pendingInputs]
            : [];
        }

        if (!hasKeepAlive) {
          this.session.keepAlive[task.id] = task.keepAlive ?? false;
        }
      }
    }
  }

  private persistSession(): void {
    if (!this.session) {
      return;
    }

    try {
      this.session.save();
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

  private installSignalHandlers(): void {
    if (this.signalHandlersInstalled) {
      return;
    }

    this.signalHandlersInstalled = true;
    const handler = (signal: NodeJS.Signals) => {
      this.persistSession();
      this.stopAllRunners();
      this.setState(AgentState.IDLE);
      const exitCode = signal === 'SIGINT' ? 130 : 143;
      process.exit(exitCode);
    };

    process.once('SIGINT', handler);
    process.once('SIGTERM', handler);
  }
}
