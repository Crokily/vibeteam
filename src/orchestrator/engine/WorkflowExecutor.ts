import { EventEmitter } from 'events';

import { AgentState } from '../state/AgentState';
import { SessionManager } from '../state/SessionManager';
import { TaskRunner } from './TaskRunner';
import { TaskStatus, WorkflowSession } from '../state/WorkflowSession';
import { RunnerFactory, WorkflowDefinition, WorkflowStage } from '../types';
import { validateWorkflow } from './workflowValidation';

export type WorkflowExecutorOptions = {
  runnerFactory?: RunnerFactory;
};

export class WorkflowExecutor extends EventEmitter {
  private readonly sessionManager: SessionManager;
  private readonly taskRunner: TaskRunner;
  private state: AgentState = AgentState.IDLE;

  constructor(sessionManager: SessionManager, options: WorkflowExecutorOptions = {}) {
    super();
    this.sessionManager = sessionManager;
    this.taskRunner = new TaskRunner(sessionManager, {
      runnerFactory: options.runnerFactory,
    });
    this.attachTaskRunnerEvents();
  }

  getState(): AgentState {
    return this.state;
  }

  getSession(): WorkflowSession {
    return this.sessionManager.getSession();
  }

  hasActiveRunners(): boolean {
    return this.taskRunner.hasActiveRunners();
  }

  executeWorkflow(workflow: WorkflowDefinition): Promise<WorkflowSession> {
    if (this.taskRunner.hasActiveRunners()) {
      throw new Error('Orchestrator is already running a workflow.');
    }

    validateWorkflow(workflow);
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
    this.taskRunner.submitInteraction(taskId, input);
  }

  stopAll(): void {
    this.taskRunner.stopAll();
    this.recalculateState();
  }

  private attachTaskRunnerEvents(): void {
    this.taskRunner.on('taskStatusChange', (payload) => {
      this.emit('taskStatusChange', payload);
      this.recalculateState();
    });

    this.taskRunner.on('interactionNeeded', (payload) => {
      this.emit('interactionNeeded', payload);
    });

    this.taskRunner.on('agentEvent', (payload) => {
      this.emit('agentEvent', payload);
    });

    this.taskRunner.on('taskOutput', (payload) => {
      this.emit('taskOutput', payload);
    });

    this.taskRunner.on('error', (error) => {
      this.emit('error', error);
    });
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
      this.taskRunner.runTask(task, stageIndex),
    );

    return Promise.all(executions)
      .then(() => undefined)
      .catch((error) => {
        this.setState(AgentState.ERROR);
        this.taskRunner.stopAll();
        throw error;
      });
  }

  private recalculateState(): void {
    const activeTaskIds = this.taskRunner.getActiveTaskIds();
    if (activeTaskIds.length === 0) {
      this.setState(AgentState.IDLE);
      return;
    }

    const session = this.sessionManager.getSession();
    const activeStatuses = activeTaskIds
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
}
