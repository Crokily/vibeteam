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

export type WorkflowSessionSnapshot = {
  id: string;
  goal: string;
  startTime: string;
  currentStageIndex: number;
  taskStatus: Record<string, TaskStatus>;
  logs: Record<string, string[]>;
  history: string[];
  workflowDefinition?: WorkflowDefinition;
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

export type SessionSummary = {
  id: string;
  goal: string;
  status: TaskStatus;
  startedAt: string;
  updatedAt: string;
  hasWorkflowDefinition: boolean;
};

export type TaskOutputStream = 'stdout' | 'stderr';

export interface OrchestratorStateChange {
  previous: OrchestratorState;
  current: OrchestratorState;
  sessionId: string | null;
}

export interface TaskStatusChange {
  sessionId: string;
  taskId: string;
  status: TaskStatus;
}

export interface TaskOutput {
  sessionId: string;
  taskId: string;
  raw: string;
  cleaned: string;
  stream: TaskOutputStream;
  timestamp: number;
}

export interface InteractionNeeded {
  sessionId: string;
  taskId: string;
  prompt?: string;
  context?: Record<string, unknown>;
}

export interface WorkflowStarted {
  sessionId: string | null;
  workflow: WorkflowDefinition;
}

export interface OrchestratorError {
  message: string;
  stack?: string;
}

export type IpcCommands = {
  'workflow:execute': (workflow: WorkflowDefinition) => Promise<string>;
  'workflow:stop': (sessionId: string) => Promise<void>;
  'task:interact': (sessionId: string, taskId: string, input: string) => Promise<void>;
  'task:resize': (
    sessionId: string,
    taskId: string,
    cols: number,
    rows: number
  ) => Promise<void>;
  'task:complete': (sessionId: string, taskId: string) => Promise<void>;
  'session:list': () => Promise<SessionSummary[]>;
  'session:load': (sessionId: string) => Promise<WorkflowSessionSnapshot>;
  'session:resume': (sessionId: string) => Promise<string>;
  'session:delete': (sessionId: string) => Promise<void>;
  'config:get': <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>;
  'config:set': <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>;
};

export type IpcEvents = {
  'orchestrator:stateChange': OrchestratorStateChange;
  'orchestrator:taskStatusChange': TaskStatusChange;
  'orchestrator:taskOutput': TaskOutput;
  'orchestrator:interactionNeeded': InteractionNeeded;
  'orchestrator:workflowStarted': WorkflowStarted;
  'orchestrator:error': OrchestratorError;
};

export type IpcCommandChannel = keyof IpcCommands;
export type IpcEventChannel = keyof IpcEvents;

export type IpcCommandArgs<C extends IpcCommandChannel> = Parameters<IpcCommands[C]>;
export type IpcCommandResult<C extends IpcCommandChannel> = ReturnType<IpcCommands[C]>;

export type IpcEventPayload<C extends IpcEventChannel> = IpcEvents[C];
