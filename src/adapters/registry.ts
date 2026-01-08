import type { ExecutionMode, IAgentAdapter } from './IAgentAdapter';

export type AdapterType = string;

export type AdapterFactoryOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  name?: string;
  [key: string]: unknown;
};

export type AdapterConstructor<TOptions extends AdapterFactoryOptions = AdapterFactoryOptions> =
  new (options?: TOptions) => IAgentAdapter;

export type AdapterMetadata = {
  displayName: string;
  icon: string;
  supportedModes: ExecutionMode[];
};

export type AdapterMetadataInput = {
  displayName?: string;
  icon?: string;
  supportedModes?: ExecutionMode[];
};

const DEFAULT_ICON = 'adapter';

export class AdapterRegistry {
  private readonly registry = new Map<AdapterType, AdapterConstructor>();
  private readonly metadata = new Map<AdapterType, AdapterMetadata>();

  register(type: AdapterType, ctor: AdapterConstructor, metadata?: AdapterMetadataInput): void {
    if (!type || !type.trim()) {
      throw new Error('Adapter type is required.');
    }
    const ctorMetadata = (ctor as AdapterConstructor & { metadata?: AdapterMetadataInput })
      .metadata;
    const resolvedMetadata = metadata ?? ctorMetadata;
    this.registry.set(type, ctor);
    this.metadata.set(type, {
      displayName: resolvedMetadata?.displayName ?? type,
      icon: resolvedMetadata?.icon ?? DEFAULT_ICON,
      supportedModes: resolvedMetadata?.supportedModes ?? [],
    });
  }

  has(type: AdapterType): boolean {
    return this.registry.has(type);
  }

  getRegisteredTypes(): AdapterType[] {
    return Array.from(this.registry.keys());
  }

  getMetadata(type: AdapterType): AdapterMetadata | undefined {
    return this.metadata.get(type);
  }

  create(type: AdapterType, options: AdapterFactoryOptions = {}): IAgentAdapter {
    const ctor = this.registry.get(type);
    if (!ctor) {
      throw new Error(`Adapter type "${type}" is not registered.`);
    }
    return new ctor(options);
  }
}

export const adapterRegistry = new AdapterRegistry();
