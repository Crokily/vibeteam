import { EventEmitter } from 'events';

import { AdapterType } from '../adapters/registry';
import { AgentState } from './state/AgentState';
import { SessionManager } from './state/SessionManager';
import { WorkflowExecutor } from './engine/WorkflowExecutor';
import { WorkflowSession } from './state/WorkflowSession';
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
  private readonly runnerFactory?: RunnerFactory;

  private defaultAdapter:
    | {
        type: AdapterType;
        cwd?: string;
        env?: NodeJS.ProcessEnv;
        name?: string;
      }
    | null = null;
  private sessionManager: SessionManager | null = null;
  private executor: WorkflowExecutor | null = null;
  private state: AgentState = AgentState.IDLE;
  private signalHandlersInstalled = false;

  constructor(options: OrchestratorOptions = {}) {
    super();
    this.runnerFactory = options.runnerFactory;
  }

  getState(): AgentState {
    return this.state;
  }

  getSession(): WorkflowSession | null {
    return this.sessionManager?.getSession() ?? null;
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
    const sessionOptions = {
      ...(options.baseDir ? { baseDir: options.baseDir } : {}),
    };
    this.sessionManager = options.sessionId
      ? SessionManager.load(options.sessionId, sessionOptions)
      : SessionManager.create(goal, sessionOptions);

    this.executor?.removeAllListeners();
    this.executor = new WorkflowExecutor(this.sessionManager, {
      ...(this.runnerFactory ? { runnerFactory: this.runnerFactory } : {}),
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

  resizeTask(taskId: string, cols: number, rows: number): void {
    if (!this.executor) {
      return;
    }

    this.executor.resizeTask(taskId, cols, rows);
  }

  completeTask(taskId: string): void {
    if (!this.executor) {
      throw new Error('No active session.');
    }

    this.executor.completeTask(taskId);
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
