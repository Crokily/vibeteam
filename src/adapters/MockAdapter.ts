import { EventEmitter } from 'events';

import { AgentLaunchConfig, ExecutionMode, IAgentAdapter } from './IAgentAdapter';

const MOCK_SCRIPT = [
  "process.stdin.setEncoding('utf8');",
  'process.stdin.resume();',
  'let buffer = "";',
  "process.stdin.on('data', (chunk) => {",
  '  buffer += chunk;',
  '  const parts = buffer.split(/\\r?\\n|\\r/);',
  '  buffer = parts.pop() ?? "";',
  '  for (const line of parts) {',
  '    const trimmed = line.trim();',
  '    if (!trimmed) {',
  '      continue;',
  '    }',
  '    if (/ping/i.test(trimmed)) {',
  "      process.stdout.write('Pong\\n');",
  '    } else {',
  "      process.stdout.write(trimmed + '\\n');",
  '    }',
  '  }',
  '});',
].join('');

export class MockAdapter extends EventEmitter implements IAgentAdapter {
  readonly name = 'mock';

  constructor(_options: Record<string, unknown> = {}) {
    super();
  }

  getLaunchConfig(
    mode: ExecutionMode,
    prompt?: string,
    _extraArgs?: string[],
  ): AgentLaunchConfig {
    if (mode === 'headless' && prompt) {
      return {
        command: process.execPath,
        args: ['-e', `console.log(${JSON.stringify(prompt)});`],
        name: 'xterm-color',
      };
    }
    return {
      command: process.execPath,
      args: ['-e', MOCK_SCRIPT],
      name: 'xterm-color',
    };
  }
}
