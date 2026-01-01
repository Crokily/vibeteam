import { EventEmitter } from 'events';

import { SessionManager } from './SessionManager';
import { TaskStatus } from './WorkflowSession';
import {
  ExecutionMode,
  OrchestratorTaskStatusChange,
  RunnerContext,
  RunnerFactory,
  WorkflowTask,
} from './types';
import { asEmitter, attachAdapterListeners, normalizeInput } from './runnerUtils';
import { createRunner, resolveLaunchConfig } from './runnerFactory';
import { prepareInitialPrompt } from './runnerPrompt';
import {
  cleanupRunner,
  handleAdapterStateChange,
  handleInteractionNeeded,
  handleRunnerEvent,
  TaskRunnerDeps,
} from './taskRunnerHandlers';

export type TaskRunnerOptions = {
  runnerFactory?: RunnerFactory;
};

const DEFAULT_EXECUTION_MODE: ExecutionMode = 'interactive';

export class TaskRunner extends EventEmitter {
  private readonly sessionManager: SessionManager;
  private readonly runnerFactory?: RunnerFactory;
  private readonly activeRunners = new Map<string, RunnerContext>();

  private readonly sendContextInput = (context: RunnerContext, input: string): void => {
    this.sendInput(context.taskId, input);
  };

  constructor(sessionManager: SessionManager, options: TaskRunnerOptions = {}) {
    super();
    this.sessionManager = sessionManager;
    this.runnerFactory = options.runnerFactory;
  }

  hasActiveRunners(): boolean {
    return this.activeRunners.size > 0;
  }

  getActiveTaskIds(): string[] {
    return Array.from(this.activeRunners.keys());
  }

  runTask(task: WorkflowTask, stageIndex: number): Promise<void> {
    if (this.activeRunners.has(task.id)) {
      throw new Error(`Task "${task.id}" is already running.`);
    }

    const executionMode = task.executionMode ?? DEFAULT_EXECUTION_MODE;
    const prompt = task.prompt?.trim();
    const { launchConfig, promptInLaunch } = resolveLaunchConfig(
      task.adapter,
      executionMode,
      prompt,
    );
    const runner = createRunner(
      this.runnerFactory,
      task.adapter,
      task.id,
      launchConfig,
      executionMode,
      prompt,
    );
    const adapterEmitter = asEmitter(task.adapter);
    const handlerDeps = this.getHandlerDeps();

    return new Promise((resolve, reject) => {
      const context: RunnerContext = {
        runner,
        adapter: task.adapter,
        adapterEmitter,
        taskId: task.id,
        stageIndex,
        executionMode,
        prompt,
        promptInLaunch,
        initialPromptSent: false,
        initialPromptTimer: null,
        onRunnerEvent: (event) =>
          handleRunnerEvent(handlerDeps, task.id, stageIndex, event),
        onInteractionNeeded: (payload) =>
          handleInteractionNeeded(handlerDeps, task.id, payload),
        onAdapterStateChange: (...args) =>
          handleAdapterStateChange(handlerDeps, task.id, ...args),
        resolve,
        reject,
      };

      this.activeRunners.set(task.id, context);
      runner.on('event', context.onRunnerEvent);

      if (adapterEmitter) {
        attachAdapterListeners(
          adapterEmitter,
          context.onInteractionNeeded,
          context.onAdapterStateChange,
        );
      }

      try {
        runner.start();
        prepareInitialPrompt(context, this.sessionManager, this.sendContextInput);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        cleanupRunner(handlerDeps, task.id);
        reject(err);
        return;
      }

      this.updateTaskStatus(task.id, 'RUNNING');
    });
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
  }

  private stopAllRunners(): void {
    const handlerDeps = this.getHandlerDeps();
    for (const taskId of Array.from(this.activeRunners.keys())) {
      cleanupRunner(handlerDeps, taskId);
    }
  }

  private persistSession(): void {
    try {
      this.sessionManager.persist();
    } catch (error) {
      this.emit('error', error);
    }
  }

  private getHandlerDeps(): TaskRunnerDeps {
    return {
      sessionManager: this.sessionManager,
      activeRunners: this.activeRunners,
      sendContextInput: this.sendContextInput,
      updateTaskStatus: this.updateTaskStatus.bind(this),
      emit: this.emit.bind(this),
    };
  }
}
