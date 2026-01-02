import { EventEmitter } from 'events';
import * as pty from 'node-pty';

import { AgentLaunchConfig, IAgentAdapter } from '../adapters/IAgentAdapter';
import { AnsiUtils } from './AnsiUtils';
import { AgentEvent } from './AgentEvent';

export type AgentOutput = {
  raw: string;
  clean: string;
};

export type AgentExit = {
  code: number | null;
  signal?: number | string | null;
};

export class AgentRunner extends EventEmitter {
  private ptyProcess: pty.IPty | null = null;

  constructor(
    private readonly adapter: IAgentAdapter,
    private readonly launchConfig: AgentLaunchConfig,
  ) {
    super();
  }

  start(): void {
    if (this.ptyProcess) {
      throw new Error('AgentRunner is already started.');
    }

    const config = this.launchConfig;

    try {
      const ptyProcess = pty.spawn(config.command, config.args ?? [], {
        name: config.name ?? 'xterm-color',
        cols: config.cols ?? 80,
        rows: config.rows ?? 30,
        cwd: config.cwd ?? process.cwd(),
        env: config.env ?? process.env,
      });

      this.ptyProcess = ptyProcess;

      ptyProcess.onData((data) => {
        const clean = AnsiUtils.strip(data);

        this.adapter.onRawOutput?.(data);
        this.adapter.onCleanOutput?.(clean);

        const output = { raw: data, clean };
        const event: AgentEvent = { type: 'data', raw: data, clean };

        this.adapter.emit('output', output);
        this.emit('data', output);
        this.emit('event', event);
      });

      ptyProcess.onExit((event) => {
        const exit: AgentExit = {
          code: event.exitCode ?? null,
          signal: event.signal ?? null,
        };
        const agentEvent: AgentEvent = {
          type: 'exit',
          code: exit.code,
          signal: exit.signal ?? null,
        };

        this.adapter.onExit?.(exit.code, exit.signal ?? null);
        this.emit('exit', exit);
        this.emit('event', agentEvent);

        this.ptyProcess = null;
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const agentEvent: AgentEvent = { type: 'error', error: err };

      this.adapter.onError?.(err);
      this.emit('event', agentEvent);

      throw err;
    }
  }

  send(input: string): void {
    if (!this.ptyProcess) {
      throw new Error('AgentRunner is not started.');
    }

    this.ptyProcess.write(input);
  }

  stop(): void {
    if (!this.ptyProcess) {
      return;
    }

    this.ptyProcess.kill();
    this.ptyProcess = null;
  }
}
