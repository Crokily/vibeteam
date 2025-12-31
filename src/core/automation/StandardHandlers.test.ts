import { EventEmitter } from 'events';
import { describe, expect, it } from 'vitest';

import { IAgentAdapter } from '../../adapters/IAgentAdapter';
import { StandardHandlers } from './StandardHandlers';

class StubAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'stub-adapter';

  getLaunchConfig() {
    return { command: 'echo', args: ['stub'] };
  }
}

describe('StandardHandlers', () => {
  it('pressEnter returns a carriage return', () => {
    const adapter = new StubAdapter();
    const result = StandardHandlers.pressEnter({
      taskId: 'task-0',
      adapter,
    });

    expect(result).toBe('\r');
  });

  it('confirmYes returns y', () => {
    const adapter = new StubAdapter();
    const result = StandardHandlers.confirmYes({
      taskId: 'task-1',
      adapter,
    });

    expect(result).toBe('y');
  });
});
