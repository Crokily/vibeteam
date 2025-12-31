import { IAgentAdapter } from '../../adapters/IAgentAdapter';

export type InteractionContext = {
  taskId: string;
  adapter: IAgentAdapter;
  payload?: unknown;
};

export type InteractionHandler = (context: InteractionContext) => string | null;

export type AutoPolicy = {
  injectArgs?: string[];
  handlers?: InteractionHandler[];
};
