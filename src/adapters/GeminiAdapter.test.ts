import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { StandardHandlers } from '../core/automation/StandardHandlers';
import { GeminiAdapter } from './GeminiAdapter';

describe('GeminiAdapter', () => {
  it('exposes an auto policy with approval args and fallback handler', () => {
    const adapter = new GeminiAdapter();

    expect(adapter.autoPolicy?.injectArgs).toEqual(['--approval-mode', 'yolo']);
    expect(adapter.autoPolicy?.handlers?.includes(StandardHandlers.pressEnter)).toBe(
      true,
    );
  });

  it('loads patterns from a workspace-relative path', () => {
    const adapter = new GeminiAdapter({
      patternsPath: path.join('src', 'adapters', 'gemini-patterns.json'),
    });

    expect(adapter.getPatternErrors()).toEqual([]);
  });
});
