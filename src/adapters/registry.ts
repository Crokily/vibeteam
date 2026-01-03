import { IAgentAdapter } from './IAgentAdapter';

export type AdapterType = string;

export type AdapterFactoryOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  name?: string;
  [key: string]: unknown;
};

export type AdapterConstructor<TOptions extends AdapterFactoryOptions = AdapterFactoryOptions> =
  new (options?: TOptions) => IAgentAdapter;

export class AdapterRegistry {
  private readonly registry = new Map<AdapterType, AdapterConstructor>();

  register(type: AdapterType, ctor: AdapterConstructor): void {
    if (!type || !type.trim()) {
      throw new Error('Adapter type is required.');
    }
    this.registry.set(type, ctor);
  }

  has(type: AdapterType): boolean {
    return this.registry.has(type);
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
