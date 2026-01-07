import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { CodexAdapter } from './index';

describe('CodexAdapter', () => {
  it('builds headless args with positional prompt', () => {
    const adapter = new CodexAdapter();
    const config = adapter.getLaunchConfig('headless', 'Fix the CI failure');

    expect(config.args).toContain('exec');
    expect(config.args).toContain('--yolo');
    expect(config.args).toContain('Fix the CI failure');
  });

  it('builds interactive args with positional prompt', () => {
    const adapter = new CodexAdapter();
    const config = adapter.getLaunchConfig('interactive', 'Hello world');

    expect(config.args).toContain('Hello world');
    expect(config.args?.includes('exec')).toBe(false);
    expect(config.args?.includes('--yolo')).toBe(false);
  });

  it('includes extraArgs between mode args and prompt', () => {
    const adapter = new CodexAdapter();
    const config = adapter.getLaunchConfig('headless', 'Hello', ['--model', 'gpt-5']);

    expect(config.args).toEqual(['exec', '--yolo', '--model', 'gpt-5', 'Hello']);
  });

  it('loads config from a workspace-relative path', () => {
    const adapter = new CodexAdapter({
      configPath: path.join('src', 'adapters', 'codex', 'config.json'),
    });

    expect(adapter.getConfigErrors()).toEqual([]);
  });
});
