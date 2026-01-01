import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { GeminiAdapter } from './GeminiAdapter';

describe('GeminiAdapter', () => {
  it('builds headless args with positional prompt', () => {
    const adapter = new GeminiAdapter();
    const config = adapter.getHeadlessLaunchConfig('Hello world');

    expect(config.args).toContain('--approval-mode');
    expect(config.args).toContain('yolo');
    expect(config.args).toContain('Hello world');
    expect(config.args?.includes('--prompt')).toBe(false);
    expect(config.args?.includes('-p')).toBe(false);
  });

  it('loads patterns from a workspace-relative path', () => {
    const adapter = new GeminiAdapter({
      patternsPath: path.join('src', 'adapters', 'gemini-patterns.json'),
    });

    expect(adapter.getPatternErrors()).toEqual([]);
  });
});
