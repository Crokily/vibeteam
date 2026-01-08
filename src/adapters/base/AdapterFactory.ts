import { BaseCLIAdapter, BaseAdapterOptions } from './BaseCLIAdapter';
import { loadAdapterConfig } from './AdapterConfigLoader';

export type CLIAdapterDefinition = {
  name: string;
  command?: string;
  config: unknown;
};

export type CLIAdapterOptions = Omit<BaseAdapterOptions, 'patterns' | 'modes'> & {
  command?: string;
  configPath?: string;
};

export const createCLIAdapter = (definition: CLIAdapterDefinition) => {
  const Adapter = class extends BaseCLIAdapter {
    readonly name = definition.name;

    private readonly command: string;
    private readonly configLoadErrors: string[];

    constructor(options: CLIAdapterOptions = {}) {
      const configResult = loadAdapterConfig(
        definition.name,
        definition.config,
        options.configPath,
      );

      super({
        ...options,
        patterns: configResult.patterns,
        modes: configResult.modes,
        name: options.name ?? definition.name,
      });

      this.command = options.command ?? definition.command ?? definition.name;
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
  };

  // Set the class name dynamically for better debugging (e.g., 'gemini' -> 'GeminiAdapter')
  const className =
    definition.name.charAt(0).toUpperCase() + definition.name.slice(1) + 'Adapter';
  Object.defineProperty(Adapter, 'name', { value: className });

  return Adapter;
};
