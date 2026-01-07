import { BaseCLIAdapter, BaseAdapterOptions } from '../base/BaseCLIAdapter';
import { loadAdapterConfig } from '../base/AdapterConfigLoader';
import embeddedConfig from './config.json';

export type CodexAdapterOptions = Omit<BaseAdapterOptions, 'patterns' | 'modes'> & {
  command?: string;
  configPath?: string;
};

export class CodexAdapter extends BaseCLIAdapter {
  readonly name = 'codex';

  private readonly command: string;
  private readonly configLoadErrors: string[];

  constructor(options: CodexAdapterOptions = {}) {
    const configResult = loadAdapterConfig('codex', embeddedConfig, options.configPath);

    super({
      ...options,
      patterns: configResult.patterns,
      modes: configResult.modes,
      name: options.name ?? 'codex',
    });

    this.command = options.command ?? 'codex';
    this.configLoadErrors = configResult.errors;

    if (options.debugSniffer) {
      for (const err of this.configLoadErrors) {
        this.logSniffer(`config load warning: ${err}`);
      }
      if (configResult.patterns.length === 0) {
        this.logSniffer('no patterns loaded; state detection disabled.');
      }
    }
  }

  getConfigErrors(): string[] {
    return this.configLoadErrors;
  }

  protected getDefaultCommand(): string {
    return this.command;
  }
}
