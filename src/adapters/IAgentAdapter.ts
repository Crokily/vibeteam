export type AgentLaunchConfig = {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cols?: number;
  rows?: number;
  name?: string;
};

export interface IAgentAdapter {
  readonly name: string;
  getLaunchConfig(): AgentLaunchConfig;
  onRawOutput?(data: string): void;
  onCleanOutput?(data: string): void;
  onExit?(code: number | null, signal?: number | null): void;
  onError?(error: Error): void;
}
