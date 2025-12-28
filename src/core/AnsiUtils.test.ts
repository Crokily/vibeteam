import { describe, expect, it } from 'vitest';

import { AnsiUtils } from './AnsiUtils';

describe('AnsiUtils', () => {
  it('strips ANSI escape codes', () => {
    const input = '\u001b[31mRed\u001b[0m Plain';

    expect(AnsiUtils.strip(input)).toBe('Red Plain');
  });

  it('returns the input when there are no ANSI codes', () => {
    const input = 'No color here';

    expect(AnsiUtils.strip(input)).toBe(input);
  });
});
