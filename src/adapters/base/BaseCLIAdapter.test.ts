import { describe, expect, it, vi } from 'vitest';
import { BaseCLIAdapter, BaseAdapterOptions } from './BaseCLIAdapter';
import { AgentLaunchConfig } from '../IAgentAdapter';

class TestAdapter extends BaseCLIAdapter {
  readonly name = 'test-adapter';

  constructor(options: BaseAdapterOptions = {}) {
    super({
        ...options,
        name: options.name ?? 'test-adapter'
    });
  }

  protected getDefaultConfig(): AgentLaunchConfig {
    return {
      command: 'test-cmd',
      args: ['arg1'],
    };
  }

  protected buildHeadlessArgs(prompt: string): string[] {
    return ['headless', prompt];
  }
  
  // Expose for testing
  public testSniff(data: string) {
      this.onCleanOutput(data);
  }
}

describe('BaseCLIAdapter', () => {
  it('merges default config with launch options', () => {
    const adapter = new TestAdapter({
      cwd: '/tmp',
      env: { TEST: '1' }
    });

    const config = adapter.getLaunchConfig();
    expect(config.command).toBe('test-cmd');
    expect(config.args).toEqual(['arg1']);
    expect(config.cwd).toBe('/tmp');
    expect(config.env).toEqual({ TEST: '1' });
    expect(config.name).toBe('test-adapter');
  });

  it('builds headless config', () => {
    const adapter = new TestAdapter();
    const config = adapter.getHeadlessLaunchConfig('hello');

    expect(config.command).toBe('test-cmd');
    expect(config.args).toEqual(['headless', 'hello']);
  });

  it('emits state changes when pattern matches', () => {
    const adapter = new TestAdapter({
      patterns: [{
        name: 'ready',
        source: 'READY',
        regex: /READY/
      }]
    });

    const listener = vi.fn();
    adapter.on('stateChange', listener);

    adapter.testSniff('System is READY now');

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      to: expect.objectContaining({ name: 'ready' })
    }));
  });
});
