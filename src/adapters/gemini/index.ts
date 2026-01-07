import { BaseCLIAdapter, BaseAdapterOptions } from '../base/BaseCLIAdapter';
import { loadAdapterConfig } from '../base/AdapterConfigLoader';
import embeddedConfig from './config.json';

export type GeminiAdapterOptions = Omit<BaseAdapterOptions, 'patterns' | 'modes'> & {
  command?: string;
  configPath?: string;
};

export class GeminiAdapter extends BaseCLIAdapter {
  readonly name = 'gemini';
  
  private readonly command: string;
  private readonly configLoadErrors: string[];

  constructor(options: GeminiAdapterOptions = {}) {
    const configResult = loadAdapterConfig('gemini', embeddedConfig, options.configPath);
    
    super({
      ...options,
      patterns: configResult.patterns,
      modes: configResult.modes,
      name: options.name ?? 'gemini',
    });

    this.command = options.command ?? 'gemini';
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
