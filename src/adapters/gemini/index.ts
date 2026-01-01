import { BaseCLIAdapter, BaseAdapterOptions } from '../base/BaseCLIAdapter';
import { AgentLaunchConfig } from '../IAgentAdapter';
import { loadGeminiPatterns } from './patternLoader';
import { buildHeadlessArgs } from './args';

export type GeminiAdapterOptions = Omit<BaseAdapterOptions, 'patterns'> & {
  command?: string;
  args?: string[];
  headlessArgs?: string[];
  patternsPath?: string;
};

export class GeminiAdapter extends BaseCLIAdapter {
  readonly name = 'gemini';
  
  private readonly command: string;
  private readonly args: string[];
  private readonly headlessArgs: string[];
  private readonly patternLoadErrors: string[];

  constructor(options: GeminiAdapterOptions = {}) {
    const patternResult = loadGeminiPatterns(options.patternsPath);
    
    super({
      ...options,
      patterns: patternResult.patterns,
      name: options.name ?? 'gemini',
    });

    this.command = options.command ?? 'gemini';
    this.args = options.args ?? ['chat'];
    this.headlessArgs = options.headlessArgs ?? this.args.filter(a => a !== 'chat');
    this.patternLoadErrors = patternResult.errors;

    if (options.debugSniffer) {
       for (const err of this.patternLoadErrors) {
           this.logSniffer(`pattern load warning: ${err}`);
       }
       if (patternResult.patterns.length === 0) {
           this.logSniffer('no patterns loaded; state detection disabled.');
       }
    }
  }

  getPatternErrors(): string[] {
      return this.patternLoadErrors;
  }

  protected getDefaultConfig(): AgentLaunchConfig {
    return {
      command: this.command,
      args: this.args,
    };
  }

  protected buildHeadlessArgs(prompt: string): string[] {
    return buildHeadlessArgs(this.headlessArgs, prompt);
  }
}
