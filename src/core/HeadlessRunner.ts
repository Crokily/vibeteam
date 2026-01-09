import { EventEmitter } from 'events';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

import { AgentLaunchConfig, IAgentAdapter } from '../adapters/IAgentAdapter';
import { AnsiUtils } from './AnsiUtils';
import { AgentEvent } from './AgentEvent';

export type HeadlessOutput = {
  raw: string;
  clean: string;
};

export type HeadlessExit = {
  code: number | null;
  signal?: string | number | null;
};

const formatLaunchDetails = (config: AgentLaunchConfig): string => {
  const args = config.args ?? [];
  const cwd = config.cwd ?? process.cwd();
  const envPath = config.env?.PATH ?? process.env.PATH ?? '';
  return [
    `command=${config.command}`,
    `args=${JSON.stringify(args)}`,
    `cwd=${cwd}`,
    `PATH=${envPath}`,
    `platform=${process.platform}`,
    `arch=${process.arch}`,
    `execPath=${process.execPath}`,
  ].join(' ');
};

export class HeadlessRunner extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null;

  constructor(
    private readonly adapter: IAgentAdapter,
    private readonly launchConfig: AgentLaunchConfig,
  ) {
    super();
  }

  start(): void {
    if (this.child) {
      throw new Error('HeadlessRunner is already started.');
    }

    const config = this.launchConfig;
    const launchDetails = formatLaunchDetails(config);

    try {
      console.log(`[HeadlessRunner] spawn ${launchDetails}`);
      const child = spawn(config.command, config.args ?? [], {
        cwd: config.cwd ?? process.cwd(),
        env: config.env ?? process.env,
        stdio: 'pipe',
      });

      this.child = child;
      child.stdin.end();

      const handleData = (chunk: Buffer) => {
        const raw = chunk.toString('utf8');
        const clean = AnsiUtils.strip(raw);

        this.adapter.onRawOutput?.(raw);
        this.adapter.onCleanOutput?.(clean);

        const output: HeadlessOutput = { raw, clean };
        const event: AgentEvent = { type: 'data', raw, clean };

        this.adapter.emit('output', output);
        this.emit('data', output);
        this.emit('event', event);
      };

      child.stdout.on('data', handleData);
      child.stderr.on('data', handleData);

      child.on('exit', (code, signal) => {
        const exit: HeadlessExit = { code: code ?? null, signal: signal ?? null };
        const event: AgentEvent = {
          type: 'exit',
          code: exit.code,
          signal: exit.signal ?? null,
        };

        this.adapter.onExit?.(exit.code, exit.signal ?? null);
        this.emit('exit', exit);
        this.emit('event', event);

        this.child = null;
      });

      child.on('error', (error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        const event: AgentEvent = { type: 'error', error: err };

        this.adapter.onError?.(err);
        this.emit('event', event);
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const debugMessage = `[HeadlessRunner] spawn failed ${launchDetails}`;
      const debugError = new Error(`${debugMessage}\n${err.message}`);
      if (err.stack) {
        debugError.stack = `${debugMessage}\n${err.stack}`;
      }
      const event: AgentEvent = { type: 'error', error: debugError };

      console.error(debugMessage);
      this.adapter.onError?.(debugError);
      this.emit('event', event);

      throw debugError;
    }
  }

  send(input: string): void {
    if (!this.child || !this.child.stdin.writable) {
      throw new Error('HeadlessRunner is not started.');
    }

    this.child.stdin.write(input);
  }

  stop(): void {
    if (!this.child) {
      return;
    }

    this.child.kill();
    this.child = null;
  }
}
