import { randomUUID } from 'crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import * as path from 'path';

export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING_FOR_USER'
  | 'DONE'
  | 'ERROR';

export type WorkflowSessionSnapshot = {
  id: string;
  goal: string;
  startTime: string;
  currentStageIndex: number;
  taskStatus: Record<string, TaskStatus>;
  pendingInputs: Record<string, string[]>;
  keepAlive: Record<string, boolean>;
  logs: Record<string, string[]>;
  history: string[];
};

const TASK_STATUSES: ReadonlySet<TaskStatus> = new Set([
  'PENDING',
  'RUNNING',
  'WAITING_FOR_USER',
  'DONE',
  'ERROR',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeLines = (chunk: string): string[] =>
  chunk
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0);

export class WorkflowSession {
  readonly id: string;
  readonly goal: string;
  readonly startTime: Date;
  readonly history: string[];
  currentStageIndex: number;
  readonly taskStatus: Record<string, TaskStatus>;
  readonly pendingInputs: Record<string, string[]>;
  readonly keepAlive: Record<string, boolean>;
  readonly logs: Record<string, string[]>;

  constructor(
    goal: string,
    options: {
      id?: string;
      startTime?: Date;
      currentStageIndex?: number;
      taskStatus?: Record<string, TaskStatus>;
      pendingInputs?: Record<string, string[]>;
      keepAlive?: Record<string, boolean>;
      logs?: Record<string, string[]>;
      history?: string[];
    } = {},
  ) {
    this.id = options.id ?? randomUUID();
    this.goal = goal;
    this.startTime = options.startTime ?? new Date();
    this.currentStageIndex = options.currentStageIndex ?? 0;
    this.taskStatus = options.taskStatus ?? {};
    this.pendingInputs = options.pendingInputs ?? {};
    this.keepAlive = options.keepAlive ?? {};
    this.logs = options.logs ?? {};
    this.history = options.history ?? [];
  }

  static create(goal: string): WorkflowSession {
    return new WorkflowSession(goal);
  }

  static load(sessionId: string, baseDir = process.cwd()): WorkflowSession {
    const sessionPath = WorkflowSession.getSessionPath(sessionId, baseDir);
    const raw = readFileSync(sessionPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    return WorkflowSession.fromSnapshot(parsed, sessionId);
  }

  static fromSnapshot(
    data: unknown,
    fallbackId: string = randomUUID(),
  ): WorkflowSession {
    if (!isRecord(data)) {
      throw new Error('Invalid session data: expected an object.');
    }

    const goal =
      typeof data.goal === 'string' && data.goal.length > 0
        ? data.goal
        : 'workflow';
    const id =
      typeof data.id === 'string' && data.id.length > 0 ? data.id : fallbackId;
    const startTime =
      typeof data.startTime === 'string' ? new Date(data.startTime) : new Date();
    const currentStageIndex =
      typeof data.currentStageIndex === 'number' && data.currentStageIndex >= 0
        ? Math.floor(data.currentStageIndex)
        : 0;

    const taskStatus: Record<string, TaskStatus> = {};
    if (data.taskStatus !== undefined) {
      if (!isRecord(data.taskStatus)) {
        throw new Error('Invalid session data: taskStatus must be an object.');
      }

      for (const [taskId, status] of Object.entries(data.taskStatus)) {
        if (typeof status !== 'string' || !TASK_STATUSES.has(status as TaskStatus)) {
          throw new Error(
            `Invalid session data: taskStatus "${taskId}" is not a valid status.`,
          );
        }
        taskStatus[taskId] = status as TaskStatus;
      }
    }

    const logs: Record<string, string[]> = {};
    if (data.logs !== undefined) {
      if (!isRecord(data.logs)) {
        throw new Error('Invalid session data: logs must be an object.');
      }

      for (const [taskId, value] of Object.entries(data.logs)) {
        if (!Array.isArray(value)) {
          throw new Error(
            `Invalid session data: logs for "${taskId}" must be an array.`,
          );
        }
        logs[taskId] = value.filter((entry): entry is string => typeof entry === 'string');
      }
    }

    const pendingInputs: Record<string, string[]> = {};
    if (data.pendingInputs !== undefined) {
      if (!isRecord(data.pendingInputs)) {
        throw new Error('Invalid session data: pendingInputs must be an object.');
      }

      for (const [taskId, value] of Object.entries(data.pendingInputs)) {
        if (!Array.isArray(value)) {
          throw new Error(
            `Invalid session data: pendingInputs for "${taskId}" must be an array.`,
          );
        }
        pendingInputs[taskId] = value.filter(
          (entry): entry is string => typeof entry === 'string',
        );
      }
    }

    const keepAlive: Record<string, boolean> = {};
    if (data.keepAlive !== undefined) {
      if (!isRecord(data.keepAlive)) {
        throw new Error('Invalid session data: keepAlive must be an object.');
      }

      for (const [taskId, value] of Object.entries(data.keepAlive)) {
        if (typeof value !== 'boolean') {
          throw new Error(
            `Invalid session data: keepAlive for "${taskId}" must be a boolean.`,
          );
        }
        keepAlive[taskId] = value;
      }
    }

    const history = Array.isArray(data.history)
      ? data.history.filter((entry): entry is string => typeof entry === 'string')
      : [];

    return new WorkflowSession(goal, {
      id,
      startTime: Number.isNaN(startTime.getTime()) ? new Date() : startTime,
      currentStageIndex,
      taskStatus,
      pendingInputs,
      keepAlive,
      logs,
      history,
    });
  }

  toJSON(): WorkflowSessionSnapshot {
    return {
      id: this.id,
      goal: this.goal,
      startTime: this.startTime.toISOString(),
      currentStageIndex: this.currentStageIndex,
      taskStatus: { ...this.taskStatus },
      pendingInputs: Object.fromEntries(
        Object.entries(this.pendingInputs).map(([taskId, inputs]) => [
          taskId,
          [...inputs],
        ]),
      ),
      keepAlive: { ...this.keepAlive },
      logs: Object.fromEntries(
        Object.entries(this.logs).map(([taskId, entries]) => [
          taskId,
          [...entries],
        ]),
      ),
      history: [...this.history],
    };
  }

  addHistory(entry: string, taskId?: string): void {
    const prefix = taskId ? `[${taskId}] ` : '';
    this.history.push(`${prefix}${entry}`);
  }

  ensureTask(taskId: string): void {
    if (!this.taskStatus[taskId]) {
      this.taskStatus[taskId] = 'PENDING';
    }

    if (!this.logs[taskId]) {
      this.logs[taskId] = [];
    }

    if (!Object.prototype.hasOwnProperty.call(this.pendingInputs, taskId)) {
      this.pendingInputs[taskId] = [];
    }

    if (!Object.prototype.hasOwnProperty.call(this.keepAlive, taskId)) {
      this.keepAlive[taskId] = false;
    }
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.taskStatus[taskId] = status;
  }

  appendLog(taskId: string, chunk: string): void {
    this.ensureTask(taskId);
    const entries = normalizeLines(chunk);
    if (entries.length === 0) {
      return;
    }
    this.logs[taskId].push(...entries);
  }

  save(baseDir = process.cwd()): void {
    const sessionDir = WorkflowSession.getSessionDir(baseDir);
    mkdirSync(sessionDir, { recursive: true });

    const sessionPath = WorkflowSession.getSessionPath(this.id, baseDir);
    const tempPath = `${sessionPath}.tmp`;
    const payload = JSON.stringify(this.toJSON(), null, 2);

    writeFileSync(tempPath, payload, 'utf8');
    renameSync(tempPath, sessionPath);
  }

  static getSessionDir(baseDir = process.cwd()): string {
    return path.join(baseDir, '.vibeteam', 'sessions');
  }

  static getSessionPath(sessionId: string, baseDir = process.cwd()): string {
    return path.join(WorkflowSession.getSessionDir(baseDir), `${sessionId}.json`);
  }
}
