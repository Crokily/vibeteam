import { EventEmitter } from 'events';

export type AgentLaunchConfig = {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cols?: number;
  rows?: number;
  name?: string;
};

export type AdapterOutputEvent = {
  raw: string;
  clean: string;
};

export interface IAgentAdapter extends EventEmitter {
  readonly name: string;
  getLaunchConfig(): AgentLaunchConfig;
  onRawOutput?(data: string): void;
  onCleanOutput?(data: string): void;
  onExit?(code: number | null, signal?: number | null): void;
  onError?(error: Error): void;
}
