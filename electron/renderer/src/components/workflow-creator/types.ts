import type { ExecutionMode } from '../../../../shared/ipc-types';

export type AgentConfig = {
  id: string;
  adapter: string;
  executionMode: ExecutionMode;
  prompt: string;
  extraArgs?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  name?: string;
};

export type LayoutState = {
  rows: string[][];
  agents: Record<string, AgentConfig>;
};

export type EnvEntry = {
  key: string;
  value: string;
};
