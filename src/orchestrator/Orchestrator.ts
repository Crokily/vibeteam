import { EventEmitter } from 'events';

import { IAgentAdapter } from '../adapters/IAgentAdapter';
import { AgentRunner } from '../core/AgentRunner';
import { AgentState } from './AgentState';
import { SessionManager } from './SessionManager';
import { WorkflowExecutor } from './WorkflowExecutor';
import { WorkflowSession } from './WorkflowSession';
import {
  ExecuteWorkflowOptions,
  OrchestratorOptions,
  OrchestratorStateChange,
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

export class Orchestrator extends EventEmitter {
  private readonly autoApprove: boolean;
  private readonly autoApproveResponse: string;
  private readonly runnerFactory: RunnerFactory;

  private defaultAdapter: IAgentAdapter | null = null;
  private sessionManager: SessionManager | null = null;
  private executor: WorkflowExecutor | null = null;
  private state: AgentState = AgentState.IDLE;
  private signalHandlersInstalled = false;

  constructor(options: OrchestratorOptions = {}) {
    super();
    this.autoApprove = options.autoApprove ?? false;
    this.autoApproveResponse = options.autoApproveResponse ?? 'y';
    this.runnerFactory =
      options.runnerFactory ??
      ((adapter, _taskId, launchConfig) => new AgentRunner(adapter, launchConfig));
  }

  getState(): AgentState {
    return this.state;
  }

  getSession(): WorkflowSession | null {
    return this.sessionManager?.getSession() ?? null;
  }

  connect(adapter: IAgentAdapter): void {
    if (this.defaultAdapter) {
      throw new Error('Orchestrator is already connected.');
    }

    this.defaultAdapter = adapter;
  }

  disconnect(): void {
    this.executor?.stopAll();
    this.executor?.removeAllListeners();
    this.executor = null;
    this.sessionManager = null;
    this.defaultAdapter = null;
    this.setState(AgentState.IDLE);
  }

  async executeWorkflow(
    workflow: WorkflowDefinition,
    options: ExecuteWorkflowOptions = {},
  ): Promise<WorkflowSession> {
    if (this.executor?.hasActiveRunners()) {
      throw new Error('Orchestrator is already running a workflow.');
    }

    const goal = workflow.goal ?? workflow.id;
    this.sessionManager = options.sessionId
      ? SessionManager.load(options.sessionId)
      : SessionManager.create(goal);

    this.executor?.removeAllListeners();
    this.executor = new WorkflowExecutor(this.sessionManager, {
      autoApprove: this.autoApprove,
      autoApproveResponse: this.autoApproveResponse,
      runnerFactory: this.runnerFactory,
    });
    this.attachExecutorEvents(this.executor);
    this.installSignalHandlers();

    return this.executor.executeWorkflow(workflow);
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
    if (!this.executor) {
      throw new Error('No active session.');
    }

    this.executor.submitInteraction(taskId, input);
  }

  private attachExecutorEvents(executor: WorkflowExecutor): void {
    executor.on('stateChange', (payload: OrchestratorStateChange) => {
      this.state = payload.to;
      this.emit('stateChange', payload);
    });

    executor.on('taskStatusChange', (payload) => {
      this.emit('taskStatusChange', payload);
    });

    executor.on('interactionNeeded', (payload) => {
      this.emit('interactionNeeded', payload);
    });

    executor.on('agentEvent', (payload) => {
      this.emit('agentEvent', payload);
    });

    executor.on('taskOutput', (payload) => {
      this.emit('taskOutput', payload);
    });

    executor.on('error', (error) => {
      this.emit('error', error);
    });
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
      session: this.sessionManager?.getSession() ?? null,
    };
    this.emit('stateChange', payload);
  }

  private installSignalHandlers(): void {
    if (this.signalHandlersInstalled) {
      return;
    }

    this.signalHandlersInstalled = true;
    const handler = (signal: NodeJS.Signals) => {
      try {
        this.sessionManager?.persist();
      } catch (error) {
        this.emit('error', error);
      }
      this.executor?.stopAll();
      this.setState(AgentState.IDLE);
      const exitCode = signal === 'SIGINT' ? 130 : 143;
      process.exit(exitCode);
    };

    process.once('SIGINT', handler);
    process.once('SIGTERM', handler);
  }
}
