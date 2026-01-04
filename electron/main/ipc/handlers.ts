import {
  appConfigKeySchema,
  type AppConfig,
} from '../../shared/config';
import type { WorkflowDefinition } from '../../shared/ipc-types';
import { appConfigValueSchemas } from '../../shared/ipc-schemas';
import { getConfig, setConfig } from '../config-store';

export const commandHandlers = {
  'workflow:execute': async (workflow: WorkflowDefinition): Promise<string> => {
    void workflow;
    return `session-${Date.now()}`;
  },
  'workflow:stop': async (): Promise<void> => {
    return undefined;
  },
  'task:interact': async (taskId: string, input: string): Promise<void> => {
    void taskId;
    void input;
    return undefined;
  },
  'task:complete': async (taskId: string): Promise<void> => {
    void taskId;
    return undefined;
  },
  'config:get': async <K extends keyof AppConfig>(
    key: K
  ): Promise<AppConfig[K]> => {
    const parsedKey = appConfigKeySchema.parse(key) as K;
    return getConfig(parsedKey);
  },
  'config:set': async <K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ): Promise<void> => {
    const parsedKey = appConfigKeySchema.parse(key) as K;
    const schema = appConfigValueSchemas[parsedKey];
    const parsedValue = schema.parse(value);
    setConfig(parsedKey, parsedValue);
  },
} as const;
