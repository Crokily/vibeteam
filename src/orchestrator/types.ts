import { AgentLaunchConfig, IAgentAdapter } from '../adapters/IAgentAdapter';
import { AgentEvent } from '../core/AgentEvent';
import { AgentState } from './state/AgentState';
import { TaskStatus, WorkflowSession } from './state/WorkflowSession';

export type ExecutionMode = 'interactive' | 'headless';

export type WorkflowTask = {
  id: string;
  adapter: IAgentAdapter;
  executionMode?: ExecutionMode;
  prompt?: string;
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

export type ExecuteWorkflowOptions = {
  sessionId?: string;
};

export type AgentRunnerLike = {
  start(): void;
  stop(): void;
  send(input: string): void;
  on(event: 'event', listener: (event: AgentEvent) => void): void;
  off?(event: 'event', listener: (event: AgentEvent) => void): void;
};

export type AdapterEmitter = {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off?(event: string, listener: (...args: unknown[]) => void): void;
};

export type AdapterStateChange = {
  to?: {
    name?: string;
  };
};

export type AdapterEmitterEvents =
  | 'interaction_needed'
  | 'interactionNeeded'
  | 'stateChange';

export type RunnerContext = {
  runner: AgentRunnerLike;
  adapter: IAgentAdapter;
  adapterEmitter: AdapterEmitter | null;
  taskId: string;
  stageIndex: number;
  executionMode: ExecutionMode;
  prompt?: string;
  promptInLaunch: boolean;
  initialPromptSent: boolean;
  initialPromptTimer: NodeJS.Timeout | null;
  onRunnerEvent: (event: AgentEvent) => void;
  onInteractionNeeded: (payload?: unknown) => void;
  onAdapterStateChange: (...args: unknown[]) => void;
  resolve: () => void;
  reject: (error: Error) => void;
};

export type RunnerFactoryContext = {
  executionMode: ExecutionMode;
  prompt?: string;
};

export type RunnerFactory = (
  adapter: IAgentAdapter,
  taskId?: string,
  launchConfig?: AgentLaunchConfig,
  context?: RunnerFactoryContext,
) => AgentRunnerLike;

export type OrchestratorOptions = {
  runnerFactory?: RunnerFactory;
};

export type OrchestratorStateChange = {
  from: AgentState;
  to: AgentState;
  session: WorkflowSession | null;
};

export type OrchestratorInteraction = {
  session: WorkflowSession | null;
  taskId: string;
  payload?: unknown;
};

export type OrchestratorAgentEvent = {
  taskId: string;
  stageIndex: number;
  session: WorkflowSession | null;
  event: AgentEvent;
};

export type OrchestratorTaskOutput = {
  taskId: string;
  stageIndex: number;
  session: WorkflowSession | null;
  raw: string;
  clean: string;
};

export type OrchestratorTaskStatusChange = {
  taskId: string;
  status: TaskStatus;
  session: WorkflowSession | null;
};
