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

const executionModeValues = ['interactive', 'headless'] as const;

export const executionModeSchema = z.enum(executionModeValues);

export const adapterMetaSchema = z
  .object({
    type: z.string(),
    displayName: z.string(),
    icon: z.string(),
    supportedModes: z.array(executionModeSchema),
  })
  .strict();

export const workflowTaskSchema = z
  .object({
    id: z.string(),
    adapter: z.string(),
    executionMode: executionModeSchema.optional(),
    prompt: z.string().optional(),
    extraArgs: z.array(z.string()).optional(),
    cwd: z.string().optional(),
    env: z.record(z.string().optional()).optional(),
    name: z.string().optional(),
  })
  .strict();

export const workflowStageSchema = z
  .object({
    id: z.string(),
    tasks: z.array(workflowTaskSchema),
  })
  .strict();

export const workflowDefinitionSchema = z
  .object({
    id: z.string(),
    goal: z.string().optional(),
    stages: z.array(workflowStageSchema),
  })
  .strict();

export const orchestratorStateSchema = z.enum(orchestratorStateValues);
export const taskStatusSchema = z.enum(taskStatusValues);
export const taskOutputStreamSchema = z.enum(taskOutputStreamValues);

export const workflowSessionSnapshotSchema = z
  .object({
    id: z.string(),
    goal: z.string(),
    startTime: z.string(),
    currentStageIndex: z.number().int().min(0),
    taskStatus: z.record(taskStatusSchema),
    logs: z.record(z.array(z.string())),
    history: z.array(z.string()),
    workflowDefinition: workflowDefinitionSchema.optional(),
  })
  .strict();

export const sessionSummarySchema = z
  .object({
    id: z.string(),
    goal: z.string(),
    status: taskStatusSchema,
    startedAt: z.string(),
    updatedAt: z.string(),
    hasWorkflowDefinition: z.boolean(),
  })
  .strict();

export const orchestratorStateChangeSchema = z
  .object({
    previous: orchestratorStateSchema,
    current: orchestratorStateSchema,
    sessionId: z.string(),
  })
  .strict();

export const taskStatusChangeSchema = z
  .object({
    sessionId: z.string(),
    taskId: z.string(),
    status: taskStatusSchema,
  })
  .strict();

export const taskOutputSchema = z
  .object({
    sessionId: z.string(),
    taskId: z.string(),
    raw: z.string(),
    cleaned: z.string(),
    stream: taskOutputStreamSchema,
    timestamp: z.number(),
  })
  .strict();

export const interactionNeededSchema = z
  .object({
    sessionId: z.string(),
    taskId: z.string(),
    prompt: z.string().optional(),
    context: z.record(z.unknown()).optional(),
  })
  .strict();

export const workflowStartedSchema = z
  .object({
    sessionId: z.string(),
    workflow: workflowDefinitionSchema,
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
  'workflow:stop': z.tuple([z.string()]),
  'task:interact': z.tuple([z.string(), z.string(), z.string()]),
  'task:resize': z.tuple([
    z.string(),
    z.string(),
    z.number().int().min(1),
    z.number().int().min(1),
  ]),
  'task:complete': z.tuple([z.string(), z.string()]),
  'adapter:list': z.tuple([]),
  'session:list': z.tuple([]),
  'session:load': z.tuple([z.string()]),
  'session:resume': z.tuple([z.string()]),
  'session:delete': z.tuple([z.string()]),
  'config:get': z.tuple([appConfigKeySchema]),
  'config:set': z.tuple([appConfigKeySchema, z.unknown()]),
} as const;

export const ipcEventSchemas = {
  'orchestrator:stateChange': orchestratorStateChangeSchema,
  'orchestrator:taskStatusChange': taskStatusChangeSchema,
  'orchestrator:taskOutput': taskOutputSchema,
  'orchestrator:interactionNeeded': interactionNeededSchema,
  'orchestrator:workflowStarted': workflowStartedSchema,
  'orchestrator:error': orchestratorErrorSchema,
} as const;

type AppConfigValueSchemas = {
  [K in keyof AppConfig]: ZodType<AppConfig[K]>;
};

export const appConfigValueSchemas = appConfigSchema.shape as AppConfigValueSchemas;
