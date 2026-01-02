import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { GeminiAdapter } from './gemini';

describe('GeminiAdapter', () => {
  it('builds headless args with positional prompt', () => {
    const adapter = new GeminiAdapter();
    const config = adapter.getLaunchConfig('headless', 'Hello world');

    expect(config.args).toContain('--approval-mode');
    expect(config.args).toContain('yolo');
    expect(config.args).toContain('Hello world');
    expect(config.args?.includes('--prompt')).toBe(false);
    expect(config.args?.includes('-p')).toBe(false);
  });

  it('builds interactive args with positional prompt', () => {
    const adapter = new GeminiAdapter();
    const config = adapter.getLaunchConfig('interactive', 'Hello world');

    expect(config.args).toContain('-i');
    expect(config.args).toContain('Hello world');
    expect(config.args?.includes('--approval-mode')).toBe(false);
  });

  it('includes extraArgs between mode args and prompt', () => {
    const adapter = new GeminiAdapter();
    const config = adapter.getLaunchConfig('interactive', 'Hello', ['--model', 'gemini-2.0']);

    expect(config.args).toEqual(['-i', '--model', 'gemini-2.0', 'Hello']);
  });

  it('loads config from a workspace-relative path', () => {
    const adapter = new GeminiAdapter({
      configPath: path.join('src', 'adapters', 'gemini', 'config.json'),
    });

    expect(adapter.getConfigErrors()).toEqual([]);
  });
});
