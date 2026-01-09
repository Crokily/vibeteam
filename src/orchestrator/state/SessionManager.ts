import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import * as path from 'path';

import { WorkflowDefinition } from '../types';
import { TaskStatus, WorkflowSession } from './WorkflowSession';

export type SessionManagerOptions = {
  baseDir?: string;
};

const MAX_SESSIONS = 50;

const normalizeLines = (chunk: string): string[] =>
  chunk
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0);

export class SessionManager {
  private readonly baseDir: string;
  private readonly session: WorkflowSession;

  private constructor(session: WorkflowSession, baseDir = process.cwd()) {
    this.session = session;
    this.baseDir = baseDir;
  }

  static create(goal: string, options: SessionManagerOptions = {}): SessionManager {
    SessionManager.pruneSessions(options.baseDir);
    return new SessionManager(new WorkflowSession(goal), options.baseDir);
  }

  static load(sessionId: string, options: SessionManagerOptions = {}): SessionManager {
    const baseDir = options.baseDir ?? process.cwd();
    const sessionPath = SessionManager.getSessionPath(sessionId, baseDir);
    const raw = readFileSync(sessionPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const session = WorkflowSession.fromSnapshot(parsed, sessionId);

    return new SessionManager(session, baseDir);
  }

  private static pruneSessions(baseDir: string = process.cwd()): void {
    const sessionDir = SessionManager.getSessionDir(baseDir);
    if (!existsSync(sessionDir)) {
      return;
    }

    try {
      const files = readdirSync(sessionDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => {
          const filePath = path.join(sessionDir, file);
          return {
            path: filePath,
            mtime: statSync(filePath).mtime.getTime(),
          };
        })
        .sort((a, b) => a.mtime - b.mtime);

      if (files.length >= MAX_SESSIONS) {
        // Remove enough files so that adding one more keeps us at MAX_SESSIONS
        const deleteCount = files.length - MAX_SESSIONS + 1;
        for (let i = 0; i < deleteCount; i++) {
          unlinkSync(files[i].path);
        }
      }
    } catch (error) {
      // Fail silently on cleanup errors to avoid blocking the main flow
      console.error('Failed to prune sessions:', error);
    }
  }

  getSession(): WorkflowSession {
    return this.session;
  }

  initializeWorkflow(workflow: WorkflowDefinition): void {
    this.session.workflowDefinition = workflow;
    for (const stage of workflow.stages) {
      for (const task of stage.tasks) {
        this.ensureTask(task.id);
      }
    }
  }

  setCurrentStageIndex(index: number): void {
    this.session.currentStageIndex = index;
  }

  ensureTask(taskId: string): void {
    if (!this.session.taskStatus[taskId]) {
      this.session.taskStatus[taskId] = 'PENDING';
    }

    if (!this.session.logs[taskId]) {
      this.session.logs[taskId] = [];
    }
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.ensureTask(taskId);
    this.session.taskStatus[taskId] = status;
  }

  appendLog(taskId: string, chunk: string): void {
    this.ensureTask(taskId);
    const entries = normalizeLines(chunk);
    if (entries.length === 0) {
      return;
    }
    this.session.logs[taskId].push(...entries);
  }

  addHistory(entry: string, taskId?: string): void {
    const prefix = taskId ? `[${taskId}] ` : '';
    this.session.history.push(`${prefix}${entry}`);
  }

  persist(): void {
    const sessionDir = SessionManager.getSessionDir(this.baseDir);
    mkdirSync(sessionDir, { recursive: true });

    const sessionPath = SessionManager.getSessionPath(this.session.id, this.baseDir);
    const tempPath = `${sessionPath}.tmp`;
    const payload = JSON.stringify(this.session.toJSON(), null, 2);

    writeFileSync(tempPath, payload, 'utf8');
    renameSync(tempPath, sessionPath);
  }

  static getSessionDir(baseDir = process.cwd()): string {
    return path.join(baseDir, '.vibeteam', 'sessions');
  }

  static getSessionPath(sessionId: string, baseDir = process.cwd()): string {
    return path.join(SessionManager.getSessionDir(baseDir), `${sessionId}.json`);
  }
}
