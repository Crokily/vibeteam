import { describe, expect, it, vi } from 'vitest';
import { BaseCLIAdapter, BaseAdapterOptions } from './BaseCLIAdapter';

class TestAdapter extends BaseCLIAdapter {
  readonly name = 'test-adapter';

  constructor(options: BaseAdapterOptions = {}) {
    super({
        ...options,
        name: options.name ?? 'test-adapter',
        modes: options.modes ?? {
          interactive: { baseArgs: ['--interactive'], promptPosition: 'last' },
          headless: { baseArgs: ['--headless'], promptPosition: 'last' },
        },
    });
  }

  protected getDefaultCommand(): string {
    return 'test-cmd';
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

    const config = adapter.getLaunchConfig('interactive', 'hello');
    expect(config.command).toBe('test-cmd');
    expect(config.args).toEqual(['--interactive', 'hello']);
    expect(config.cwd).toBe('/tmp');
    expect(config.env).toEqual({ TEST: '1' });
    expect(config.name).toBe('test-adapter');
  });

  it('builds headless config', () => {
    const adapter = new TestAdapter();
    const config = adapter.getLaunchConfig('headless', 'hello');

    expect(config.command).toBe('test-cmd');
    expect(config.args).toEqual(['--headless', 'hello']);
  });

  it('includes extraArgs between mode args and prompt', () => {
    const adapter = new TestAdapter();
    const config = adapter.getLaunchConfig('interactive', 'hello', ['--extra']);

    expect(config.args).toEqual(['--interactive', '--extra', 'hello']);
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
