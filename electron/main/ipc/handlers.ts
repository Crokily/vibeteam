import { app } from 'electron';
import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import * as path from 'path';
import {
  appConfigKeySchema,
  type AppConfig,
} from '../../shared/config';
import type {
  SessionSummary,
  TaskStatus,
  WorkflowDefinition,
  WorkflowSessionSnapshot,
} from '../../shared/ipc-types';
import { appConfigValueSchemas } from '../../shared/ipc-schemas';
import { SessionManager } from '../../../src/orchestrator';
import { getConfig, setConfig } from '../config-store';
import { getOrchestrator } from '../orchestrator';
import { sendIpcEvent } from './events';

type CoreSession = ReturnType<SessionManager['getSession']>;

const resolveBaseDir = (): string => app.getPath('userData');

const resolveSessionStatus = (taskStatus: Record<string, TaskStatus>): TaskStatus => {
  const statuses = Object.values(taskStatus);
  if (statuses.includes('ERROR')) {
    return 'ERROR';
  }
  if (statuses.includes('WAITING_FOR_USER')) {
    return 'WAITING_FOR_USER';
  }
  if (statuses.includes('RUNNING')) {
    return 'RUNNING';
  }
  if (statuses.length > 0 && statuses.every((status) => status === 'DONE')) {
    return 'DONE';
  }
  return 'PENDING';
};

const buildSessionSummary = (session: CoreSession, updatedAt: Date): SessionSummary => {
  const taskStatus = session.taskStatus as Record<string, TaskStatus>;
  return {
    id: session.id,
    goal: session.goal,
    status: resolveSessionStatus(taskStatus),
    startedAt: session.startTime.toISOString(),
    updatedAt: updatedAt.toISOString(),
    hasWorkflowDefinition: !!session.workflowDefinition,
  };
};

export const commandHandlers = {
  'workflow:execute': async (workflow: WorkflowDefinition): Promise<string> => {
    const orchestrator = getOrchestrator();
    const baseDir = resolveBaseDir();
    const executePromise = orchestrator.executeWorkflow(workflow, { baseDir });
    const sessionId = orchestrator.getSession()?.id ?? null;
    sendIpcEvent('orchestrator:workflowStarted', { sessionId, workflow });
    const session = await executePromise;
    return session.id;
  },
  'workflow:stop': async (): Promise<void> => {
    getOrchestrator().disconnect();
  },
  'task:interact': async (taskId: string, input: string): Promise<void> => {
    getOrchestrator().submitInteraction(taskId, input);
  },
  'task:resize': async (
    taskId: string,
    cols: number,
    rows: number
  ): Promise<void> => {
    getOrchestrator().resizeTask(taskId, cols, rows);
  },
  'task:complete': async (taskId: string): Promise<void> => {
    getOrchestrator().completeTask(taskId);
  },
  'session:list': async (): Promise<SessionSummary[]> => {
    const baseDir = resolveBaseDir();
    const sessionsDir = SessionManager.getSessionDir(baseDir);
    if (!existsSync(sessionsDir)) {
      return [];
    }

    const summaries: SessionSummary[] = [];
    const entries = readdirSync(sessionsDir).filter((entry) => entry.endsWith('.json'));

    for (const entry of entries) {
      const sessionId = path.basename(entry, '.json');
      try {
        const stats = statSync(path.join(sessionsDir, entry));
        const manager = SessionManager.load(sessionId, { baseDir });
        summaries.push(buildSessionSummary(manager.getSession(), stats.mtime));
      } catch {
        continue;
      }
    }

    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  'session:load': async (sessionId: string): Promise<WorkflowSessionSnapshot> => {
    const baseDir = resolveBaseDir();
    const manager = SessionManager.load(sessionId, { baseDir });
    return manager.getSession().toJSON() as WorkflowSessionSnapshot;
  },
  'session:resume': async (sessionId: string): Promise<string> => {
    const baseDir = resolveBaseDir();
    const manager = SessionManager.load(sessionId, { baseDir });
    const session = manager.getSession();
    if (!session.workflowDefinition) {
      throw new Error('Session cannot be resumed because workflow definition is missing.');
    }

    const orchestrator = getOrchestrator();
    const workflowDefinition = session.workflowDefinition as WorkflowDefinition;
    const executePromise = orchestrator.executeWorkflow(workflowDefinition, {
      sessionId,
      baseDir,
    });
    sendIpcEvent('orchestrator:workflowStarted', { sessionId, workflow: workflowDefinition });
    const resumedSession = await executePromise;
    return resumedSession.id;
  },
  'session:delete': async (sessionId: string): Promise<void> => {
    const baseDir = resolveBaseDir();
    const sessionPath = SessionManager.getSessionPath(sessionId, baseDir);
    if (!existsSync(sessionPath)) {
      return;
    }
    unlinkSync(sessionPath);
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
