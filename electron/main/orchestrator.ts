import type { BrowserWindow } from 'electron';
import { GeminiAdapter } from '../../src/adapters/gemini';
import { adapterRegistry } from '../../src/adapters/registry';
import {
  AgentState,
  Orchestrator,
  type OrchestratorInteraction,
  type OrchestratorStateChange as CoreStateChange,
  type OrchestratorTaskOutput as CoreTaskOutput,
  type OrchestratorTaskStatusChange as CoreTaskStatusChange,
} from '../../src/orchestrator';
import type {
  IpcEventChannel,
  IpcEventPayload,
  OrchestratorState,
  TaskStatus as IpcTaskStatus,
} from '../shared/ipc-types';
import { sendIpcEvent } from './ipc/events';

let orchestrator: Orchestrator | null = null;
let mainWindowRef: BrowserWindow | null = null;
let listenersAttached = false;

if (!adapterRegistry.has('gemini')) {
  adapterRegistry.register('gemini', GeminiAdapter);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const mapAgentState = (state: AgentState): OrchestratorState =>
  state as OrchestratorState;

const mapTaskStatus = (
  status: CoreTaskStatusChange['status'],
): IpcTaskStatus => status as IpcTaskStatus;

const sendToRenderer = <E extends IpcEventChannel>(
  channel: E,
  payload: IpcEventPayload<E>,
): void => {
  sendIpcEvent(channel, payload, mainWindowRef);
};

const handleStateChange = (payload: CoreStateChange): void => {
  sendToRenderer('orchestrator:stateChange', {
    previous: mapAgentState(payload.from),
    current: mapAgentState(payload.to),
    sessionId: payload.session?.id ?? null,
  });
};

const handleTaskStatusChange = (payload: CoreTaskStatusChange): void => {
  sendToRenderer('orchestrator:taskStatusChange', {
    taskId: payload.taskId,
    status: mapTaskStatus(payload.status),
  });
};

const handleTaskOutput = (payload: CoreTaskOutput): void => {
  sendToRenderer('orchestrator:taskOutput', {
    taskId: payload.taskId,
    raw: payload.raw,
    cleaned: payload.clean,
    stream: 'stdout',
    timestamp: Date.now(),
  });
};

const resolveInteractionPayload = (
  payload?: OrchestratorInteraction['payload'],
): { prompt?: string; context?: Record<string, unknown> } => {
  if (typeof payload === 'string') {
    return { prompt: payload };
  }

  if (isRecord(payload)) {
    const prompt = typeof payload.prompt === 'string' ? payload.prompt : undefined;
    return { prompt, context: payload };
  }

  return {};
};

const handleInteractionNeeded = (payload: OrchestratorInteraction): void => {
  const { prompt, context } = resolveInteractionPayload(payload.payload);
  sendToRenderer('orchestrator:interactionNeeded', {
    taskId: payload.taskId,
    ...(prompt ? { prompt } : {}),
    ...(context ? { context } : {}),
  });
};

const handleError = (error: unknown): void => {
  const err = error instanceof Error ? error : new Error(String(error));
  sendToRenderer('orchestrator:error', {
    message: err.message,
    ...(err.stack ? { stack: err.stack } : {}),
  });
};

const attachListeners = (instance: Orchestrator): void => {
  if (listenersAttached) {
    return;
  }

  instance.on('stateChange', handleStateChange);
  instance.on('taskStatusChange', handleTaskStatusChange);
  instance.on('taskOutput', handleTaskOutput);
  instance.on('interactionNeeded', handleInteractionNeeded);
  instance.on('error', handleError);
  listenersAttached = true;
};

const detachListeners = (instance: Orchestrator): void => {
  if (!listenersAttached) {
    return;
  }

  instance.removeListener('stateChange', handleStateChange);
  instance.removeListener('taskStatusChange', handleTaskStatusChange);
  instance.removeListener('taskOutput', handleTaskOutput);
  instance.removeListener('interactionNeeded', handleInteractionNeeded);
  instance.removeListener('error', handleError);
  listenersAttached = false;
};

export const getOrchestrator = (): Orchestrator => {
  if (!orchestrator) {
    orchestrator = new Orchestrator();
  }

  return orchestrator;
};

export const initOrchestrator = (mainWindow: BrowserWindow): Orchestrator => {
  mainWindowRef = mainWindow;
  const instance = getOrchestrator();
  attachListeners(instance);
  return instance;
};

export const shutdownOrchestrator = (): void => {
  mainWindowRef = null;
  if (!orchestrator) {
    return;
  }

  detachListeners(orchestrator);
  orchestrator.disconnect();
};
