import { EventEmitter } from 'events';
import * as path from 'path';

import { AgentLaunchConfig, IAgentAdapter } from './IAgentAdapter';
import {
  CompiledPattern,
  PatternLoadResult,
  PatternLoader,
} from './PatternLoader';
import geminiPatterns from './gemini-patterns.json';

const DEFAULT_BUFFER_SIZE = 4096;

export type GeminiAdapterOptions = {
  command?: string;
  args?: string[];
  headlessArgs?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cols?: number;
  rows?: number;
  name?: string;
  patternsPath?: string;
  bufferSize?: number;
  debugSniffer?: boolean;
};

export type GeminiAdapterState = {
  name: string;
  description?: string;
};

export type GeminiStateChange = {
  from: GeminiAdapterState | null;
  to: GeminiAdapterState;
  pattern: CompiledPattern;
};

const normalizeChunk = (chunk: string): string =>
  chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

export class GeminiAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'gemini';
  onStateChange?: (event: GeminiStateChange) => void;

  private readonly command: string;
  private readonly args: string[];
  private readonly headlessArgs: string[];
  private readonly launchOptions: Omit<AgentLaunchConfig, 'command' | 'args'>;
  private readonly bufferSize: number;
  private readonly debugSniffer: boolean;
  private readonly patterns: CompiledPattern[];
  private readonly patternLoadErrors: string[];

  private buffer = '';
  private state: GeminiAdapterState | null = null;

  constructor(options: GeminiAdapterOptions = {}) {
    super();

    this.command = options.command ?? 'gemini';
    this.args = options.args ?? ['chat'];
    this.headlessArgs =
      options.headlessArgs ?? this.args.filter((arg) => arg !== 'chat');
    this.launchOptions = {
      cwd: options.cwd,
      env: options.env,
      cols: options.cols,
      rows: options.rows,
      name: options.name,
    };

    this.bufferSize =
      typeof options.bufferSize === 'number' && options.bufferSize > 0
        ? Math.floor(options.bufferSize)
        : DEFAULT_BUFFER_SIZE;
    this.debugSniffer = options.debugSniffer ?? false;

    const patternResult = this.loadPatterns(options.patternsPath);
    this.patterns = patternResult.patterns;
    this.patternLoadErrors = patternResult.errors;

    if (this.debugSniffer) {
      if (this.patternLoadErrors.length > 0) {
        for (const error of this.patternLoadErrors) {
          this.logSniffer(`pattern load warning: ${error}`);
        }
      }

      if (this.patterns.length === 0) {
        this.logSniffer('no patterns loaded; state detection disabled.');
      }
    }
  }

  getLaunchConfig(): AgentLaunchConfig {
    return {
      command: this.command,
      args: this.args,
      ...this.launchOptions,
    };
  }

  getHeadlessLaunchConfig(prompt: string): AgentLaunchConfig {
    const normalizedPrompt = prompt.trim();

    return {
      command: this.command,
      args: this.buildHeadlessArgs(normalizedPrompt),
      ...this.launchOptions,
    };
  }

  onCleanOutput(data: string): void {
    this.sniff(data);
  }

  getState(): GeminiAdapterState | null {
    return this.state;
  }

  getPatternErrors(): string[] {
    return [...this.patternLoadErrors];
  }

  private loadPatterns(patternsPath?: string): PatternLoadResult {
    const candidates = this.resolvePatternPaths(patternsPath);
    const errors: string[] = [];

    for (const candidate of candidates) {
      const result = PatternLoader.loadFromFile(candidate);
      if (result.patterns.length > 0) {
        return result;
      }
      errors.push(...result.errors);
    }

    const fallback = PatternLoader.loadFromObject(
      geminiPatterns,
      'embedded gemini-patterns.json',
    );

    return {
      patterns: fallback.patterns,
      errors: [...errors, ...fallback.errors],
    };
  }

  private resolvePatternPaths(patternsPath?: string): string[] {
    if (patternsPath) {
      return [path.resolve(patternsPath)];
    }

    const cwd = process.cwd();
    return [
      path.join(cwd, 'src', 'adapters', 'gemini-patterns.json'),
      path.join(cwd, 'dist', 'adapters', 'gemini-patterns.json'),
      path.join(cwd, 'adapters', 'gemini-patterns.json'),
      path.join(cwd, 'gemini-patterns.json'),
    ];
  }

  private buildHeadlessArgs(prompt: string): string[] {
    const withoutApproval = this.stripApprovalArgs(this.headlessArgs);
    const withoutPrompt = this.stripPromptArgs(withoutApproval);
    const withoutChat = withoutPrompt.filter((arg) => arg !== 'chat');

    return [...withoutChat, '--approval-mode', 'yolo', prompt];
  }

  private stripPromptArgs(args: string[]): string[] {
    const result: string[] = [];
    let skipNext = false;

    for (const arg of args) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
      if (arg === '--prompt' || arg === '-p') {
        skipNext = true;
        continue;
      }
      if (arg.startsWith('--prompt=')) {
        continue;
      }
      result.push(arg);
    }

    return result;
  }

  private stripApprovalArgs(args: string[]): string[] {
    const result: string[] = [];
    let skipNext = false;

    for (const arg of args) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
      if (arg === '--approval-mode') {
        skipNext = true;
        continue;
      }
      if (arg.startsWith('--approval-mode=')) {
        continue;
      }
      result.push(arg);
    }

    return result;
  }

  private sniff(chunk: string): void {
    if (!chunk || this.patterns.length === 0) {
      return;
    }

    this.buffer += normalizeChunk(chunk);

    if (this.buffer.length > this.bufferSize) {
      this.buffer = this.buffer.slice(-this.bufferSize);
    }

    for (const pattern of this.patterns) {
      pattern.regex.lastIndex = 0;

      if (!pattern.regex.test(this.buffer)) {
        continue;
      }

      const nextState: GeminiAdapterState = {
        name: pattern.name,
        description: pattern.description,
      };
      const changed = this.state?.name !== nextState.name;

      if (this.debugSniffer) {
        const status = changed ? 'state-change' : 'match';
        const description = pattern.description
          ? ` description="${pattern.description}"`
          : '';
        const previous = this.state?.name ? ` from="${this.state.name}"` : '';

        this.logSniffer(
          `${status}: state="${pattern.name}"${previous} pattern="${pattern.source}"${description}`,
        );
      }

      if (changed) {
        const event: GeminiStateChange = {
          from: this.state,
          to: nextState,
          pattern,
        };

        this.state = nextState;
        this.emit('stateChange', event);
        this.onStateChange?.(event);
      }

      return;
    }
  }

  private logSniffer(message: string): void {
    process.stderr.write(`[GeminiAdapter][sniffer] ${message}\n`);
  }
}
