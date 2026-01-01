import { EventEmitter } from 'events';

import { AgentLaunchConfig, IAgentAdapter } from '../IAgentAdapter';
import { CompiledPattern } from '../PatternLoader';
import { OutputSniffer, AdapterState } from './OutputSniffer';

export type BaseAdapterOptions = {
  // Generic Launch Options
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cols?: number;
  rows?: number;
  name?: string;

  // Sniffer Options
  patterns?: CompiledPattern[];
  bufferSize?: number;
  debugSniffer?: boolean;
};

export type AdapterStateChange = {
  from: AdapterState | null;
  to: AdapterState;
  pattern: CompiledPattern;
};

export abstract class BaseCLIAdapter extends EventEmitter implements IAgentAdapter {
  abstract readonly name: string;
  
  // To be implemented by subclasses
  protected abstract getDefaultConfig(): AgentLaunchConfig;
  protected abstract buildHeadlessArgs(prompt: string): string[];

  private readonly launchOptions: Omit<AgentLaunchConfig, 'command' | 'args'>;
  private readonly sniffer: OutputSniffer;
  private readonly debugSniffer: boolean;
  
  private state: AdapterState | null = null;

  constructor(options: BaseAdapterOptions) {
    super();
    this.launchOptions = {
      cwd: options.cwd,
      env: options.env,
      cols: options.cols,
      rows: options.rows,
      name: options.name,
    };
    this.debugSniffer = options.debugSniffer ?? false;
    this.sniffer = new OutputSniffer(
      options.patterns ?? [],
      options.bufferSize
    );
  }

  getLaunchConfig(): AgentLaunchConfig {
    const defaults = this.getDefaultConfig();
    return {
      ...defaults,
      ...this.launchOptions,
    };
  }

  getHeadlessLaunchConfig(prompt: string): AgentLaunchConfig {
    const defaults = this.getDefaultConfig();
    return {
      command: defaults.command,
      args: this.buildHeadlessArgs(prompt.trim()),
      ...this.launchOptions,
    };
  }

  onCleanOutput(data: string): void {
    const result = this.sniffer.sniff(data);
    
    if (result) {
      this.handleSniffResult(result.newState, result.match);
    }
  }

  // Generic hooks that can be overridden if needed, but usually default is fine
  onRawOutput(_data: string): void {
    // Default implementation does nothing, but interface requires it
  }

  onExit(_code: number | null, _signal: number | string | null): void {
    // Default implementation does nothing
  }

  onError(_error: Error): void {
    // Default implementation does nothing
  }
  
  getState(): AdapterState | null {
    return this.state;
  }

  protected logSniffer(message: string): void {
    if (this.debugSniffer) {
      process.stderr.write(`[${this.name}][sniffer] ${message}\n`);
    }
  }

  private handleSniffResult(nextState: AdapterState | null, match: CompiledPattern | null): void {
    if (!nextState || !match) return;

    const changed = this.state?.name !== nextState.name;

    if (this.debugSniffer) {
      const status = changed ? 'state-change' : 'match';
      const description = match.description
          ? ` description="${match.description}"`
          : '';
      const previous = this.state?.name ? ` from="${this.state.name}"` : '';

      this.logSniffer(
          `${status}: state="${match.name}"${previous} pattern="${match.source}"${description}`,
      );
    }

    if (changed) {
      const event: AdapterStateChange = {
        from: this.state,
        to: nextState,
        pattern: match,
      };
      
      this.state = nextState;
      this.emit('stateChange', event);
    }
  }
}
