import { EventEmitter } from 'events';

export type ExecutionMode = 'interactive' | 'headless';

export type ModeConfig = {
  baseArgs: string[];
  promptPosition: 'last' | 'flag';
  promptFlag?: string;
};

export type ModesConfig = {
  interactive?: ModeConfig;
  headless?: ModeConfig;
};

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
  getLaunchConfig(
    mode: ExecutionMode,
    prompt?: string,
    extraArgs?: string[],
  ): AgentLaunchConfig;
  onRawOutput?(data: string): void;
  onCleanOutput?(data: string): void;
  onExit?(code: number | null, signal?: number | string | null): void;
  onError?(error: Error): void;
}
