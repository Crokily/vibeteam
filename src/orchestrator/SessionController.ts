import { EventEmitter } from 'events';

import { WorkflowExecutor } from './engine/WorkflowExecutor';
import { AgentState } from './state/AgentState';
import { SessionManager } from './state/SessionManager';
import { WorkflowSession } from './state/WorkflowSession';
import type {
  OrchestratorAgentEvent,
  OrchestratorInteraction,
  OrchestratorStateChange,
  OrchestratorTaskOutput,
  OrchestratorTaskStatusChange,
  RunnerFactory,
  WorkflowDefinition,
} from './types';

export type SessionControllerOptions = {
  runnerFactory?: RunnerFactory;
};

export class SessionController extends EventEmitter {
  private readonly sessionManager: SessionManager;
  private readonly executor: WorkflowExecutor;
  private listenersAttached = false;

  readonly sessionId: string;

  constructor(sessionManager: SessionManager, options: SessionControllerOptions = {}) {
    super();
    this.sessionManager = sessionManager;
    this.executor = new WorkflowExecutor(this.sessionManager, {
      ...(options.runnerFactory ? { runnerFactory: options.runnerFactory } : {}),
    });
    this.sessionId = this.sessionManager.getSession().id;
    this.attachExecutorEvents();
  }

  getState(): AgentState {
    return this.executor.getState();
  }

  getSession(): WorkflowSession {
    return this.sessionManager.getSession();
  }

  executeWorkflow(workflow: WorkflowDefinition): Promise<WorkflowSession> {
    return this.executor.executeWorkflow(workflow);
  }

  submitInteraction(taskId: string, input: string): void {
    this.executor.submitInteraction(taskId, input);
  }

  resizeTask(taskId: string, cols: number, rows: number): void {
    this.executor.resizeTask(taskId, cols, rows);
  }

  completeTask(taskId: string): void {
    this.executor.completeTask(taskId);
  }

  stopAll(): void {
    this.executor.stopAll();
  }

  persist(): void {
    this.sessionManager.persist();
  }

  dispose(): void {
    this.stopAll();
    this.detachExecutorEvents();
    this.executor.removeAllListeners();
  }

  private attachExecutorEvents(): void {
    if (this.listenersAttached) {
      return;
    }

    this.executor.on('stateChange', this.handleStateChange);
    this.executor.on('taskStatusChange', this.handleTaskStatusChange);
    this.executor.on('interactionNeeded', this.handleInteractionNeeded);
    this.executor.on('agentEvent', this.handleAgentEvent);
    this.executor.on('taskOutput', this.handleTaskOutput);
    this.executor.on('error', this.handleError);
    this.listenersAttached = true;
  }

  private detachExecutorEvents(): void {
    if (!this.listenersAttached) {
      return;
    }

    this.executor.removeListener('stateChange', this.handleStateChange);
    this.executor.removeListener('taskStatusChange', this.handleTaskStatusChange);
    this.executor.removeListener('interactionNeeded', this.handleInteractionNeeded);
    this.executor.removeListener('agentEvent', this.handleAgentEvent);
    this.executor.removeListener('taskOutput', this.handleTaskOutput);
    this.executor.removeListener('error', this.handleError);
    this.listenersAttached = false;
  }

  private handleStateChange = (payload: OrchestratorStateChange): void => {
    this.emit('stateChange', {
      ...payload,
      sessionId: this.sessionId,
      session: payload.session ?? this.getSession(),
    });
  };

  private handleTaskStatusChange = (payload: OrchestratorTaskStatusChange): void => {
    this.emit('taskStatusChange', {
      ...payload,
      sessionId: this.sessionId,
      session: payload.session ?? this.getSession(),
    });
  };

  private handleInteractionNeeded = (payload: OrchestratorInteraction): void => {
    this.emit('interactionNeeded', {
      ...payload,
      sessionId: this.sessionId,
      session: payload.session ?? this.getSession(),
    });
  };

  private handleAgentEvent = (payload: OrchestratorAgentEvent): void => {
    this.emit('agentEvent', {
      ...payload,
      sessionId: this.sessionId,
      session: payload.session ?? this.getSession(),
    });
  };

  private handleTaskOutput = (payload: OrchestratorTaskOutput): void => {
    this.emit('taskOutput', {
      ...payload,
      sessionId: this.sessionId,
      session: payload.session ?? this.getSession(),
    });
  };

  private handleError = (error: unknown): void => {
    this.emit('error', error);
  };
}
