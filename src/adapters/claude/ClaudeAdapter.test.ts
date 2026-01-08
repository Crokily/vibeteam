import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { ClaudeAdapter } from './index';

describe('ClaudeAdapter', () => {
  it('has the correct class name', () => {
    const adapter = new ClaudeAdapter();
    expect(adapter.constructor.name).toBe('ClaudeAdapter');
  });

  it('builds headless args with positional prompt', () => {
    const adapter = new ClaudeAdapter();
    const config = adapter.getLaunchConfig('headless', 'Fix the CI failure');

    expect(config.args).toContain('-p');
    expect(config.args).toContain('--dangerously-skip-permissions');
    expect(config.args).toContain('Fix the CI failure');
  });

  it('builds interactive args with positional prompt', () => {
    const adapter = new ClaudeAdapter();
    const config = adapter.getLaunchConfig('interactive', 'Hello world');

    expect(config.args).toContain('Hello world');
    expect(config.args?.includes('-p')).toBe(false);
    expect(config.args?.includes('--dangerously-skip-permissions')).toBe(false);
  });

  it('includes extraArgs between mode args and prompt', () => {
    const adapter = new ClaudeAdapter();
    const config = adapter.getLaunchConfig('headless', 'Hello', ['--model', 'claude-3-5-sonnet']);

    expect(config.args).toEqual([
      '-p',
      '--dangerously-skip-permissions',
      '--model',
      'claude-3-5-sonnet',
      'Hello',
    ]);
  });

  it('loads config from a workspace-relative path', () => {
    const adapter = new ClaudeAdapter({
      configPath: path.join('src', 'adapters', 'claude', 'config.json'),
    });

    expect(adapter.getConfigErrors()).toEqual([]);
  });
});
