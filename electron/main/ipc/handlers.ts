import {
  appConfigKeySchema,
  type AppConfig,
} from '../../shared/config';
import type { WorkflowDefinition } from '../../shared/ipc-types';
import { appConfigValueSchemas } from '../../shared/ipc-schemas';
import { getConfig, setConfig } from '../config-store';
import { getOrchestrator } from '../orchestrator';

export const commandHandlers = {
  'workflow:execute': async (workflow: WorkflowDefinition): Promise<string> => {
    const session = await getOrchestrator().executeWorkflow(workflow);
    return session.id;
  },
  'workflow:stop': async (): Promise<void> => {
    getOrchestrator().disconnect();
  },
  'task:interact': async (taskId: string, input: string): Promise<void> => {
    getOrchestrator().submitInteraction(taskId, input);
  },
  'task:complete': async (taskId: string): Promise<void> => {
    getOrchestrator().completeTask(taskId);
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
