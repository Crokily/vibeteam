import { z, type ZodType } from 'zod';
import {
  appConfigKeySchema,
  appConfigSchema,
  type AppConfig,
} from './config';

const orchestratorStateValues = [
  'IDLE',
  'RUNNING',
  'AWAITING_INTERACTION',
  'PAUSED',
  'ERROR',
] as const;

const taskStatusValues = [
  'PENDING',
  'RUNNING',
  'WAITING_FOR_USER',
  'DONE',
  'ERROR',
] as const;

const taskOutputStreamValues = ['stdout', 'stderr'] as const;

export const workflowDefinitionSchema = z.record(z.unknown());

export const orchestratorStateSchema = z.enum(orchestratorStateValues);
export const taskStatusSchema = z.enum(taskStatusValues);
export const taskOutputStreamSchema = z.enum(taskOutputStreamValues);

export const orchestratorStateChangeSchema = z
  .object({
    previous: orchestratorStateSchema,
    current: orchestratorStateSchema,
    sessionId: z.string().nullable(),
  })
  .strict();

export const taskStatusChangeSchema = z
  .object({
    taskId: z.string(),
    status: taskStatusSchema,
  })
  .strict();

export const taskOutputSchema = z
  .object({
    taskId: z.string(),
    raw: z.string(),
    cleaned: z.string(),
    stream: taskOutputStreamSchema,
    timestamp: z.number(),
  })
  .strict();

export const interactionNeededSchema = z
  .object({
    taskId: z.string(),
    prompt: z.string().optional(),
    context: z.record(z.unknown()).optional(),
  })
  .strict();

export const orchestratorErrorSchema = z
  .object({
    message: z.string(),
    stack: z.string().optional(),
  })
  .strict();

export const ipcCommandSchemas = {
  'workflow:execute': z.tuple([workflowDefinitionSchema]),
  'workflow:stop': z.tuple([]),
  'task:interact': z.tuple([z.string(), z.string()]),
  'task:complete': z.tuple([z.string()]),
  'config:get': z.tuple([appConfigKeySchema]),
  'config:set': z.tuple([appConfigKeySchema, z.unknown()]),
} as const;

export const ipcEventSchemas = {
  'orchestrator:stateChange': orchestratorStateChangeSchema,
  'orchestrator:taskStatusChange': taskStatusChangeSchema,
  'orchestrator:taskOutput': taskOutputSchema,
  'orchestrator:interactionNeeded': interactionNeededSchema,
  'orchestrator:error': orchestratorErrorSchema,
} as const;

type AppConfigValueSchemas = {
  [K in keyof AppConfig]: ZodType<AppConfig[K]>;
};

export const appConfigValueSchemas = appConfigSchema.shape as AppConfigValueSchemas;
