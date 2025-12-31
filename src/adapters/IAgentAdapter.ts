import { EventEmitter } from 'events';

import { AutoPolicy } from '../core/automation/types';

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
  autoPolicy?: AutoPolicy;
  getLaunchConfig(): AgentLaunchConfig;
  onRawOutput?(data: string): void;
  onCleanOutput?(data: string): void;
  onExit?(code: number | null, signal?: number | null): void;
  onError?(error: Error): void;
}
