import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { OpencodeAdapter } from './index';

describe('OpencodeAdapter', () => {
  it('has the correct class name', () => {
    const adapter = new OpencodeAdapter();
    expect(adapter.constructor.name).toBe('OpencodeAdapter');
  });

  it('builds headless args with positional prompt', () => {
    const adapter = new OpencodeAdapter();
    const config = adapter.getLaunchConfig('headless', 'Fix the CI failure');

    expect(config.args).toContain('run');
    expect(config.args).toContain('Fix the CI failure');
    expect(config.args?.includes('--prompt')).toBe(false);
  });

  it('builds interactive args with prompt flag', () => {
    const adapter = new OpencodeAdapter();
    const config = adapter.getLaunchConfig('interactive', 'sayhi');

    expect(config.args).toContain('--prompt');
    expect(config.args).toContain('sayhi');
    expect(config.args?.includes('run')).toBe(false);
  });

  it('includes extraArgs between mode args and prompt', () => {
    const adapter = new OpencodeAdapter();
    const config = adapter.getLaunchConfig('headless', 'Hello', ['--model', 'opencode-pro']);

    expect(config.args).toEqual(['run', '--model', 'opencode-pro', 'Hello']);
  });

  it('loads config from a workspace-relative path', () => {
    const adapter = new OpencodeAdapter({
      configPath: path.join('src', 'adapters', 'opencode', 'config.json'),
    });

    expect(adapter.getConfigErrors()).toEqual([]);
  });
});
