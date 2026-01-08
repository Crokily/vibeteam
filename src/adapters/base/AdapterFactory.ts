import { BaseCLIAdapter, BaseAdapterOptions } from './BaseCLIAdapter';
import { loadAdapterConfig } from './AdapterConfigLoader';
import type { ExecutionMode, ModesConfig } from '../IAgentAdapter';

export type CLIAdapterDefinition = {
  name: string;
  command?: string;
  config: unknown;
};

export type CLIAdapterOptions = Omit<BaseAdapterOptions, 'patterns' | 'modes'> & {
  command?: string;
  configPath?: string;
};

const resolveSupportedModes = (modes: ModesConfig): ExecutionMode[] =>
  (['interactive', 'headless'] as const).filter((mode) => !!modes[mode]);

export const createCLIAdapter = (definition: CLIAdapterDefinition) => {
  // 1. Load config statically to capture metadata
  const staticConfig = loadAdapterConfig(definition.name, definition.config);

  const Adapter = class extends BaseCLIAdapter {
    readonly name = definition.name;

    private readonly command: string;
    private readonly configLoadErrors: string[];

    constructor(options: CLIAdapterOptions = {}) {
      // Reload config if configPath is provided, otherwise fallback to static/default
      const configResult = options.configPath
        ? loadAdapterConfig(definition.name, definition.config, options.configPath)
        : staticConfig;

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

  // 2. Set the class name dynamically for better debugging
  const className =
    definition.name.charAt(0).toUpperCase() + definition.name.slice(1) + 'Adapter';
  Object.defineProperty(Adapter, 'name', { value: className });

  // 3. Attach static metadata for registry
  (Adapter as any).metadata = {
    displayName: staticConfig.metadata.displayName,
    icon: staticConfig.metadata.icon,
    supportedModes: resolveSupportedModes(staticConfig.modes),
  };

  return Adapter;
};
