import { EventEmitter } from 'events';
import { describe, expect, it } from 'vitest';

import { ExecutionMode, IAgentAdapter } from './IAgentAdapter';
import { AdapterRegistry } from './registry';

type TestAdapterOptions = {
  cwd?: string;
  name?: string;
};

class TestAdapter extends EventEmitter implements IAgentAdapter {
  readonly name: string;
  readonly options: TestAdapterOptions;

  constructor(options: TestAdapterOptions = {}) {
    super();
    this.options = options;
    this.name = options.name ?? 'test';
  }

  getLaunchConfig(
    mode: ExecutionMode,
    prompt?: string,
    extraArgs?: string[],
  ) {
    return {
      command: 'echo',
      args: [mode, prompt ?? '', ...(extraArgs ?? [])],
    };
  }
}

describe('AdapterRegistry', () => {
  it('creates adapter instances with provided options', () => {
    const registry = new AdapterRegistry();
    registry.register('test', TestAdapter);

    const first = registry.create('test', { cwd: '/tmp', name: 'one' });
    const second = registry.create('test', { cwd: '/tmp', name: 'two' });

    expect(first).not.toBe(second);
    expect(first.name).toBe('one');
    expect((first as TestAdapter).options.cwd).toBe('/tmp');
    expect(second.name).toBe('two');
  });

  it('throws when creating an unknown adapter type', () => {
    const registry = new AdapterRegistry();

    expect(() => registry.create('missing')).toThrow(
      'Adapter type "missing" is not registered.',
    );
  });
});
