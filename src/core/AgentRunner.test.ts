import { describe, expect, it } from 'vitest';

import { MockAdapter } from '../adapters/MockAdapter';
import { AgentRunner } from './AgentRunner';

const waitForPong = (runner: AgentRunner, timeoutMs = 3000) =>
  new Promise<string>((resolve, reject) => {
    let buffer = '';

    const onData = (output: { raw: string; clean: string }) => {
      buffer += output.clean;
      if (buffer.includes('Pong')) {
        cleanup();
        resolve(buffer);
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for Pong'));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      runner.off('data', onData);
    };

    runner.on('data', onData);
  });

describe('AgentRunner + MockAdapter', () => {
  it('emits pong on ping', async () => {
    const runner = new AgentRunner(new MockAdapter());

    runner.start();

    try {
      const outputPromise = waitForPong(runner);

      runner.send('Ping\r');

      const output = await outputPromise;
      expect(output).toContain('Pong');
    } finally {
      runner.stop();
    }
  });
});
