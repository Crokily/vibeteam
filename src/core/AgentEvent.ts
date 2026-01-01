export type AgentDataEvent = {
  type: 'data';
  raw: string;
  clean: string;
};

export type AgentExitEvent = {
  type: 'exit';
  code: number | null;
  signal?: number | string | null;
};

export type AgentErrorEvent = {
  type: 'error';
  error: Error;
};

export type AgentEvent = AgentDataEvent | AgentExitEvent | AgentErrorEvent;
