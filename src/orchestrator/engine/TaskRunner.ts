import { EventEmitter } from 'events';

import { ExecutionMode } from '../../adapters/IAgentAdapter';
import { adapterRegistry } from '../../adapters/registry';
import { SessionManager } from '../state/SessionManager';
import { TaskStatus } from '../state/WorkflowSession';
import {
  OrchestratorTaskStatusChange,
  RunnerContext,
  RunnerFactory,
  WorkflowTask,
} from '../types';
import { asEmitter, attachAdapterListeners } from './runnerUtils';
import { createRunner, resolveLaunchConfig } from './runnerFactory';
import { recordInitialPrompt } from './runnerPrompt';
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
    const adapterName =
      task.name && task.name.trim().length > 0 ? task.name : task.id;
    const adapter = adapterRegistry.create(task.adapter, {
      cwd: task.cwd,
      env: task.env,
      name: adapterName,
    });
    const launchConfig = resolveLaunchConfig(
      adapter,
      executionMode,
      prompt,
      task.extraArgs,
    );
    const baseEnv = {
      ...process.env,
      ...(launchConfig.env ?? {}),
    };
    if (executionMode === 'interactive') {
      if (!baseEnv.TERM) {
        baseEnv.TERM = 'xterm-256color';
      }
      if (!baseEnv.COLORTERM) {
        baseEnv.COLORTERM = 'truecolor';
      }
    }
    launchConfig.env = baseEnv;
    const runner = createRunner(
      this.runnerFactory,
      adapter,
      task.id,
      launchConfig,
      executionMode,
      prompt,
    );
    const adapterEmitter = asEmitter(adapter);
    const handlerDeps = this.getHandlerDeps();

    return new Promise((resolve, reject) => {
      const context: RunnerContext = {
        runner,
        adapter,
        adapterEmitter,
        taskId: task.id,
        stageIndex,
        executionMode,
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
        recordInitialPrompt(this.sessionManager, task.id, prompt);
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
    const context = this.activeRunners.get(taskId);
    if (!context) {
      throw new Error(`Task "${taskId}" is not active.`);
    }

    if (context.executionMode !== 'interactive') {
      throw new Error(`Task "${taskId}" is not interactive.`);
    }

    if (status === 'WAITING_FOR_USER') {
      this.sendInput(taskId, input);
      this.updateTaskStatus(taskId, 'RUNNING');
      return;
    }

    if (status && status !== 'RUNNING') {
      throw new Error(`Task "${taskId}" is not accepting input.`);
    }

    this.sendInput(taskId, input);
  }

  completeTask(taskId: string): void {
    const context = this.activeRunners.get(taskId);
    if (!context) {
      throw new Error(`Task "${taskId}" is not active.`);
    }

    if (context.executionMode !== 'interactive') {
      throw new Error(`Task "${taskId}" is not interactive.`);
    }

    cleanupRunner(this.getHandlerDeps(), taskId);
    this.updateTaskStatus(taskId, 'DONE');
    context.resolve();
  }

  stopAll(): void {
    this.stopAllRunners();
  }

  resizeTask(taskId: string, cols: number, rows: number): void {
    const context = this.activeRunners.get(taskId);
    if (!context || context.executionMode !== 'interactive') {
      return;
    }

    context.runner.resize?.(cols, rows);
  }

  private sendInput(taskId: string, input: string): void {
    const context = this.activeRunners.get(taskId);
    if (!context) {
      throw new Error(`Task "${taskId}" is not active.`);
    }

    context.runner.send(input);
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
      updateTaskStatus: this.updateTaskStatus.bind(this),
      emit: this.emit.bind(this),
    };
  }
}
