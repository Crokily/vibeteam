import { EventEmitter } from 'events';

import { AdapterType } from '../adapters/registry';
import { SessionController } from './SessionController';
import { AgentState } from './state/AgentState';
import { SessionManager } from './state/SessionManager';
import { WorkflowSession } from './state/WorkflowSession';
import {
  ExecuteWorkflowOptions,
  OrchestratorAgentEvent,
  OrchestratorInteraction,
  OrchestratorOptions,
  OrchestratorStateChange,
  OrchestratorTaskOutput,
  OrchestratorTaskStatusChange,
  RunnerFactory,
  WorkflowDefinition,
} from './types';

export type {
  ExecuteWorkflowOptions,
  OrchestratorAgentEvent,
  OrchestratorInteraction,
  OrchestratorOptions,
  OrchestratorStateChange,
  OrchestratorTaskOutput,
  OrchestratorTaskStatusChange,
  WorkflowDefinition,
  WorkflowStage,
  WorkflowTask,
} from './types';

type SessionListenerSet = {
  stateChange: (payload: OrchestratorStateChange) => void;
  taskStatusChange: (payload: OrchestratorTaskStatusChange) => void;
  interactionNeeded: (payload: OrchestratorInteraction) => void;
  agentEvent: (payload: OrchestratorAgentEvent) => void;
  taskOutput: (payload: OrchestratorTaskOutput) => void;
  error: (error: unknown) => void;
};

export class Orchestrator extends EventEmitter {
  private readonly runnerFactory?: RunnerFactory;
  private readonly sessions = new Map<string, SessionController>();
  private readonly sessionListeners = new Map<string, SessionListenerSet>();

  private defaultAdapter:
    | {
        type: AdapterType;
        cwd?: string;
        env?: NodeJS.ProcessEnv;
        name?: string;
      }
    | null = null;
  private signalHandlersInstalled = false;
  private lastSessionId: string | null = null;

  constructor(options: OrchestratorOptions = {}) {
    super();
    this.runnerFactory = options.runnerFactory;
  }

  getState(sessionId?: string): AgentState {
    const resolvedId = sessionId ?? this.lastSessionId;
    if (!resolvedId) {
      return AgentState.IDLE;
    }
    return this.sessions.get(resolvedId)?.getState() ?? AgentState.IDLE;
  }

  getSession(sessionId?: string): WorkflowSession | null {
    const resolvedId = sessionId ?? this.lastSessionId;
    if (!resolvedId) {
      return null;
    }
    return this.sessions.get(resolvedId)?.getSession() ?? null;
  }

  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  connect(
    adapterType: AdapterType,
    options: { cwd?: string; env?: NodeJS.ProcessEnv; name?: string } = {},
  ): void {
    if (this.defaultAdapter) {
      throw new Error('Orchestrator is already connected.');
    }

    this.defaultAdapter = {
      type: adapterType,
      cwd: options.cwd,
      env: options.env,
      name: options.name,
    };
  }

  disconnect(): void {
    for (const controller of this.sessions.values()) {
      this.detachSessionEvents(controller);
      controller.dispose();
    }
    this.sessions.clear();
    this.sessionListeners.clear();
    this.defaultAdapter = null;
    this.lastSessionId = null;
  }

  createSession(goal: string, options: ExecuteWorkflowOptions = {}): string {
    return this.startSession(goal, options);
  }

  startSession(goal: string, options: ExecuteWorkflowOptions = {}): string {
    if (!goal.trim()) {
      throw new Error('Session goal is required.');
    }

    const controller = this.createSessionController(goal, options);
    return controller.sessionId;
  }

  stopSession(sessionId: string): void {
    const controller = this.sessions.get(sessionId);
    if (!controller) {
      throw new Error('No active session.');
    }

    controller.stopAll();
  }

  removeSession(sessionId: string): void {
    const controller = this.sessions.get(sessionId);
    if (!controller) {
      return;
    }

    this.detachSessionEvents(controller);
    controller.dispose();
    this.sessions.delete(sessionId);
    this.sessionListeners.delete(sessionId);
    if (this.lastSessionId === sessionId) {
      this.lastSessionId = null;
    }
  }

  async executeWorkflow(
    workflow: WorkflowDefinition,
    options: ExecuteWorkflowOptions = {},
  ): Promise<WorkflowSession> {
    const goal = workflow.goal ?? workflow.id;
    const controller = options.sessionId
      ? this.getOrLoadSessionController(options.sessionId, options)
      : this.createSessionController(goal, options);

    this.installSignalHandlers();
    this.lastSessionId = controller.sessionId;

    return controller.executeWorkflow(workflow);
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
              adapter: this.defaultAdapter.type,
              ...(this.defaultAdapter.cwd
                ? { cwd: this.defaultAdapter.cwd }
                : {}),
              ...(this.defaultAdapter.env
                ? { env: this.defaultAdapter.env }
                : {}),
              ...(this.defaultAdapter.name
                ? { name: this.defaultAdapter.name }
                : {}),
              prompt: goal,
            },
          ],
        },
      ],
    };

    void this.executeWorkflow(workflow).catch((error) => {
      this.emit('error', error);
    });
  }

  submitInteraction(sessionId: string, taskId: string, input: string): void {
    const controller = this.sessions.get(sessionId);
    if (!controller) {
      throw new Error('No active session.');
    }

    controller.submitInteraction(taskId, input);
  }

  resizeTask(sessionId: string, taskId: string, cols: number, rows: number): void {
    const controller = this.sessions.get(sessionId);
    if (!controller) {
      return;
    }

    controller.resizeTask(taskId, cols, rows);
  }

  completeTask(sessionId: string, taskId: string): void {
    const controller = this.sessions.get(sessionId);
    if (!controller) {
      throw new Error('No active session.');
    }

    controller.completeTask(taskId);
  }

  private createSessionController(
    goal: string,
    options: ExecuteWorkflowOptions,
  ): SessionController {
    const sessionOptions = {
      ...(options.baseDir ? { baseDir: options.baseDir } : {}),
    };
    const sessionManager = SessionManager.create(goal, sessionOptions);
    return this.registerSession(
      new SessionController(sessionManager, {
        ...(this.runnerFactory ? { runnerFactory: this.runnerFactory } : {}),
      }),
    );
  }

  private getOrLoadSessionController(
    sessionId: string,
    options: ExecuteWorkflowOptions,
  ): SessionController {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const sessionOptions = {
      ...(options.baseDir ? { baseDir: options.baseDir } : {}),
    };
    const sessionManager = SessionManager.load(sessionId, sessionOptions);
    return this.registerSession(
      new SessionController(sessionManager, {
        ...(this.runnerFactory ? { runnerFactory: this.runnerFactory } : {}),
      }),
    );
  }

  private registerSession(controller: SessionController): SessionController {
    this.sessions.set(controller.sessionId, controller);
    this.lastSessionId = controller.sessionId;
    this.attachSessionEvents(controller);
    return controller;
  }

  private attachSessionEvents(controller: SessionController): void {
    if (this.sessionListeners.has(controller.sessionId)) {
      return;
    }

    const listeners: SessionListenerSet = {
      stateChange: (payload) => {
        this.emit('stateChange', payload);
      },
      taskStatusChange: (payload) => {
        this.emit('taskStatusChange', payload);
      },
      interactionNeeded: (payload) => {
        this.emit('interactionNeeded', payload);
      },
      agentEvent: (payload) => {
        this.emit('agentEvent', payload);
      },
      taskOutput: (payload) => {
        this.emit('taskOutput', payload);
      },
      error: (error) => {
        this.emit('error', error);
      },
    };

    controller.on('stateChange', listeners.stateChange);
    controller.on('taskStatusChange', listeners.taskStatusChange);
    controller.on('interactionNeeded', listeners.interactionNeeded);
    controller.on('agentEvent', listeners.agentEvent);
    controller.on('taskOutput', listeners.taskOutput);
    controller.on('error', listeners.error);

    this.sessionListeners.set(controller.sessionId, listeners);
  }

  private detachSessionEvents(controller: SessionController): void {
    const listeners = this.sessionListeners.get(controller.sessionId);
    if (!listeners) {
      return;
    }

    controller.removeListener('stateChange', listeners.stateChange);
    controller.removeListener('taskStatusChange', listeners.taskStatusChange);
    controller.removeListener('interactionNeeded', listeners.interactionNeeded);
    controller.removeListener('agentEvent', listeners.agentEvent);
    controller.removeListener('taskOutput', listeners.taskOutput);
    controller.removeListener('error', listeners.error);
    this.sessionListeners.delete(controller.sessionId);
  }

  private installSignalHandlers(): void {
    if (this.signalHandlersInstalled) {
      return;
    }

    this.signalHandlersInstalled = true;
    const handler = (signal: NodeJS.Signals) => {
      for (const controller of this.sessions.values()) {
        try {
          controller.persist();
        } catch (error) {
          this.emit('error', error);
        }
        controller.stopAll();
      }
      const exitCode = signal === 'SIGINT' ? 130 : 143;
      process.exit(exitCode);
    };

    process.once('SIGINT', handler);
    process.once('SIGTERM', handler);
  }
}
