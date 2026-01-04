import type { AppConfig } from './config';

export type ExecutionMode = 'interactive' | 'headless';
export type AdapterType = string;

export type WorkflowTask = {
  id: string;
  adapter: AdapterType;
  executionMode?: ExecutionMode;
  prompt?: string;
  extraArgs?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  name?: string;
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

export type OrchestratorState =
  | 'IDLE'
  | 'RUNNING'
  | 'AWAITING_INTERACTION'
  | 'PAUSED'
  | 'ERROR';

export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING_FOR_USER'
  | 'DONE'
  | 'ERROR';

export type TaskOutputStream = 'stdout' | 'stderr';

export interface OrchestratorStateChange {
  previous: OrchestratorState;
  current: OrchestratorState;
  sessionId: string | null;
}

export interface TaskStatusChange {
  taskId: string;
  status: TaskStatus;
}

export interface TaskOutput {
  taskId: string;
  raw: string;
  cleaned: string;
  stream: TaskOutputStream;
  timestamp: number;
}

export interface InteractionNeeded {
  taskId: string;
  prompt?: string;
  context?: Record<string, unknown>;
}

export interface OrchestratorError {
  message: string;
  stack?: string;
}

export type IpcCommands = {
  'workflow:execute': (workflow: WorkflowDefinition) => Promise<string>;
  'workflow:stop': () => Promise<void>;
  'task:interact': (taskId: string, input: string) => Promise<void>;
  'task:complete': (taskId: string) => Promise<void>;
  'config:get': <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>;
  'config:set': <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>;
};

export type IpcEvents = {
  'orchestrator:stateChange': OrchestratorStateChange;
  'orchestrator:taskStatusChange': TaskStatusChange;
  'orchestrator:taskOutput': TaskOutput;
  'orchestrator:interactionNeeded': InteractionNeeded;
  'orchestrator:error': OrchestratorError;
};

export type IpcCommandChannel = keyof IpcCommands;
export type IpcEventChannel = keyof IpcEvents;

export type IpcCommandArgs<C extends IpcCommandChannel> = Parameters<IpcCommands[C]>;
export type IpcCommandResult<C extends IpcCommandChannel> = ReturnType<IpcCommands[C]>;

export type IpcEventPayload<C extends IpcEventChannel> = IpcEvents[C];
