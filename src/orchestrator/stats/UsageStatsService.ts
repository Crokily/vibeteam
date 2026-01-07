import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import * as path from 'path';

import type { ExecutionMode, WorkflowDefinition, WorkflowTask } from '../types';

export type AgentUsageConfig = {
  adapter: string;
  executionMode: ExecutionMode;
  prompt?: string;
  extraArgs?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
};

export type AgentUsageEntry = {
  hash: string;
  count: number;
  lastUsed: number;
  config: AgentUsageConfig;
};

export type WorkflowUsageEntry = {
  hash: string;
  count: number;
  lastUsed: number;
  definition: WorkflowDefinition;
};

type StoredAgentUsageEntry = Omit<AgentUsageEntry, 'hash'>;
type StoredWorkflowUsageEntry = Omit<WorkflowUsageEntry, 'hash'>;

const normalizeOptionalString = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeStringArray = (value?: string[]): string[] | undefined => {
  if (!value) {
    return undefined;
  }
  const next = value.map((item) => item.trim()).filter(Boolean);
  return next.length > 0 ? next : undefined;
};

const normalizeEnv = (
  env?: Record<string, string | undefined>,
): Record<string, string | undefined> | undefined => {
  if (!env) {
    return undefined;
  }
  const entries = Object.entries(env)
    .map(([key, value]) => [key.trim(), value] as const)
    .filter(([key]) => key.length > 0);
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries);
};

const normalizeEnvEntries = (
  env?: Record<string, string | undefined>,
): Array<[string, string | undefined]> | undefined => {
  const normalized = normalizeEnv(env);
  if (!normalized) {
    return undefined;
  }
  return Object.entries(normalized).sort(([left], [right]) => left.localeCompare(right));
};

export class UsageStatsService {
  private baseDir: string;
  private readonly maxEntries: number;
  private workflowCache: Record<string, StoredWorkflowUsageEntry> | null = null;
  private agentCache: Record<string, StoredAgentUsageEntry> | null = null;

  constructor(options: { baseDir?: string; maxEntries?: number } = {}) {
    this.baseDir = options.baseDir ?? process.cwd();
    this.maxEntries = options.maxEntries ?? 20;
  }

  setBaseDir(baseDir: string): void {
    if (this.baseDir === baseDir) {
      return;
    }
    this.baseDir = baseDir;
    this.workflowCache = null;
    this.agentCache = null;
  }

  recordWorkflowUsage(workflow: WorkflowDefinition): void {
    const entries = this.getWorkflowEntries();
    const hash = this.hashWorkflow(workflow);
    const now = Date.now();
    const existing = entries[hash];
    if (existing) {
      existing.count += 1;
      existing.lastUsed = now;
      existing.definition = workflow;
    } else {
      entries[hash] = {
        count: 1,
        lastUsed: now,
        definition: workflow,
      };
    }
    this.pruneEntries(entries);
    this.persistWorkflow(entries);
  }

  recordAgentUsage(task: WorkflowTask): void {
    const entries = this.getAgentEntries();
    const config = this.buildAgentConfig(task);
    const hash = this.hashAgent(config);
    const now = Date.now();
    const existing = entries[hash];
    if (existing) {
      existing.count += 1;
      existing.lastUsed = now;
      existing.config = config;
    } else {
      entries[hash] = {
        count: 1,
        lastUsed: now,
        config,
      };
    }
    this.pruneEntries(entries);
    this.persistAgent(entries);
  }

  getTopWorkflows(limit: number): WorkflowUsageEntry[] {
    return this.sortEntries(this.getWorkflowEntries()).slice(0, limit);
  }

  getTopAgents(limit: number): AgentUsageEntry[] {
    return this.sortEntries(this.getAgentEntries()).slice(0, limit);
  }

  private buildAgentConfig(task: WorkflowTask): AgentUsageConfig {
    return {
      adapter: task.adapter,
      executionMode: task.executionMode ?? 'interactive',
      prompt: normalizeOptionalString(task.prompt),
      extraArgs: normalizeStringArray(task.extraArgs),
      cwd: normalizeOptionalString(task.cwd),
      env: normalizeEnv(task.env as Record<string, string | undefined> | undefined),
    };
  }

  private hashWorkflow(workflow: WorkflowDefinition): string {
    const stages = workflow.stages.map((stage) =>
      stage.tasks.map((task) => this.buildTaskFingerprint(task)),
    );
    return this.hashPayload({ stages });
  }

  private buildTaskFingerprint(task: WorkflowTask): Record<string, unknown> {
    const config = this.buildAgentConfig(task);
    return {
      adapter: config.adapter,
      executionMode: config.executionMode,
      prompt: config.prompt,
      extraArgs: config.extraArgs,
      cwd: config.cwd,
      env: normalizeEnvEntries(config.env),
    };
  }

  private hashAgent(config: AgentUsageConfig): string {
    return this.hashPayload({
      adapter: config.adapter,
      executionMode: config.executionMode,
      prompt: config.prompt,
      env: normalizeEnvEntries(config.env),
    });
  }

  private hashPayload(payload: unknown): string {
    const serialized = JSON.stringify(payload);
    return createHash('md5').update(serialized).digest('hex');
  }

  private pruneEntries<T extends { count: number; lastUsed: number }>(
    entries: Record<string, T>,
  ): void {
    const sorted = this.sortEntries(entries);
    if (sorted.length <= this.maxEntries) {
      return;
    }
    const keep = new Set(sorted.slice(0, this.maxEntries).map((entry) => entry.hash));
    Object.keys(entries).forEach((hash) => {
      if (!keep.has(hash)) {
        delete entries[hash];
      }
    });
  }

  private sortEntries<T extends { count: number; lastUsed: number }>(
    entries: Record<string, T>,
  ): Array<T & { hash: string }> {
    return Object.entries(entries)
      .map(([hash, entry]) => ({ hash, ...entry }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return right.lastUsed - left.lastUsed;
      });
  }

  private getWorkflowEntries(): Record<string, StoredWorkflowUsageEntry> {
    if (!this.workflowCache) {
      this.workflowCache = this.readEntries<StoredWorkflowUsageEntry>(
        this.resolveWorkflowPath(),
      );
    }
    return this.workflowCache;
  }

  private getAgentEntries(): Record<string, StoredAgentUsageEntry> {
    if (!this.agentCache) {
      this.agentCache = this.readEntries<StoredAgentUsageEntry>(this.resolveAgentPath());
    }
    return this.agentCache;
  }

  private readEntries<T>(filePath: string): Record<string, T> {
    if (!existsSync(filePath)) {
      return {};
    }
    try {
      const raw = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      return parsed as Record<string, T>;
    } catch {
      return {};
    }
  }

  private persistWorkflow(entries: Record<string, StoredWorkflowUsageEntry>): void {
    this.persistEntries(this.resolveWorkflowPath(), entries);
  }

  private persistAgent(entries: Record<string, StoredAgentUsageEntry>): void {
    this.persistEntries(this.resolveAgentPath(), entries);
  }

  private persistEntries(filePath: string, entries: Record<string, unknown>): void {
    const dir = path.dirname(filePath);
    mkdirSync(dir, { recursive: true });
    const payload = JSON.stringify(entries, null, 2);
    const tempPath = `${filePath}.tmp`;
    writeFileSync(tempPath, payload, 'utf8');
    renameSync(tempPath, filePath);
  }

  private resolveWorkflowPath(): string {
    return path.join(this.baseDir, 'stats', 'workflow-usage.json');
  }

  private resolveAgentPath(): string {
    return path.join(this.baseDir, 'stats', 'agent-usage.json');
  }
}
