import { AgentLaunchConfig, IAgentAdapter } from '../adapters/IAgentAdapter';
import { AgentEvent } from '../core/AgentEvent';
import { AgentState } from './AgentState';
import { TaskStatus, WorkflowSession } from './WorkflowSession';

export type WorkflowTask = {
  id: string;
  adapter: IAgentAdapter;
  pendingInputs?: string[];
  keepAlive?: boolean;
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

export type RunnerFactory = (
  adapter: IAgentAdapter,
  taskId?: string,
  launchConfig?: AgentLaunchConfig,
) => AgentRunnerLike;

export type OrchestratorOptions = {
  autoApprove?: boolean;
  autoApproveResponse?: string;
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
