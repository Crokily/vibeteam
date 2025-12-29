import { describe, expect, it } from 'vitest';

import { PatternLoader } from './PatternLoader';

describe('PatternLoader', () => {
  it('compiles patterns and matches expected output', () => {
    const result = PatternLoader.loadFromObject(
      {
        states: {
          approval: {
            pattern: 'approve\\? \\[y/N\\]',
            flags: 'i',
            description: 'Approval prompt',
          },
        },
      },
      'inline patterns',
    );

    expect(result.errors).toEqual([]);
    expect(result.patterns).toHaveLength(1);

    const [pattern] = result.patterns;
    expect(pattern.name).toBe('approval');
    expect(pattern.description).toBe('Approval prompt');
    expect(pattern.regex.test('Approve? [y/N]')).toBe(true);
  });

  it('reports invalid regex patterns', () => {
    const result = PatternLoader.loadFromObject(
      {
        states: {
          broken: {
            pattern: '(',
          },
        },
      },
      'inline patterns',
    );

    expect(result.patterns).toHaveLength(0);
    expect(result.errors[0]).toContain('Invalid regex');
  });
});
