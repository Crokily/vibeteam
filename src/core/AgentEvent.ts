export type AgentDataEvent = {
  type: 'data';
  raw: string;
  clean: string;
};

export type AgentExitEvent = {
  type: 'exit';
  code: number | null;
  signal?: number | null;
};

export type AgentErrorEvent = {
  type: 'error';
  error: Error;
};

export type AgentEvent = AgentDataEvent | AgentExitEvent | AgentErrorEvent;
