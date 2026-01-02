import { AgentEvent } from '../../core/AgentEvent';
import { SessionManager } from '../state/SessionManager';
import { TaskStatus } from '../state/WorkflowSession';
import {
  AdapterStateChange,
  OrchestratorAgentEvent,
  OrchestratorInteraction,
  OrchestratorTaskOutput,
  RunnerContext,
} from '../types';
import { detachAdapterListeners } from './runnerUtils';

export type TaskRunnerDeps = {
  sessionManager: SessionManager;
  activeRunners: Map<string, RunnerContext>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  emit: (event: string, ...args: unknown[]) => boolean;
};

export const cleanupRunner = (deps: TaskRunnerDeps, taskId: string): void => {
  const context = deps.activeRunners.get(taskId);
  if (!context) {
    return;
  }

  if (context.runner.off) {
    context.runner.off('event', context.onRunnerEvent);
  }

  if (context.adapterEmitter) {
    detachAdapterListeners(
      context.adapterEmitter,
      context.onInteractionNeeded,
      context.onAdapterStateChange,
    );
  }

  context.runner.stop();
  deps.activeRunners.delete(taskId);
};

export const handleInteractionNeeded = (
  deps: TaskRunnerDeps,
  taskId: string,
  payload?: unknown,
): void => {
  deps.updateTaskStatus(taskId, 'WAITING_FOR_USER');

  const event: OrchestratorInteraction = {
    session: deps.sessionManager.getSession(),
    taskId,
    payload,
  };
  deps.emit('interactionNeeded', event);
};

export const handleAdapterStateChange = (
  deps: TaskRunnerDeps,
  taskId: string,
  ...args: unknown[]
): void => {
  const event = args[0] as AdapterStateChange;
  const stateName = event?.to?.name?.toLowerCase();
  if (!stateName) {
    return;
  }

  // Interaction states trigger user notification
  if (stateName.includes('interaction')) {
    handleInteractionNeeded(deps, taskId, {
      source: 'stateChange',
      state: event.to,
    });
  }
};

export const handleRunnerEvent = (
  deps: TaskRunnerDeps,
  taskId: string,
  stageIndex: number,
  event: AgentEvent,
): void => {
  const session = deps.sessionManager.getSession();
  const payload: OrchestratorAgentEvent = {
    taskId,
    stageIndex,
    session,
    event,
  };

  deps.emit('agentEvent', payload);

  if (event.type === 'data') {
    deps.sessionManager.appendLog(taskId, event.clean);
    const outputEvent: OrchestratorTaskOutput = {
      taskId,
      stageIndex,
      session,
      raw: event.raw,
      clean: event.clean,
    };
    deps.emit('taskOutput', outputEvent);
    return;
  }

  const context = deps.activeRunners.get(taskId);
  if (!context) {
    return;
  }

  if (event.type === 'error') {
    deps.updateTaskStatus(taskId, 'ERROR');
    cleanupRunner(deps, taskId);
    context.reject(event.error);
    return;
  }

  if (event.type === 'exit') {
    deps.updateTaskStatus(taskId, 'DONE');
    cleanupRunner(deps, taskId);
    context.resolve();
  }
};
