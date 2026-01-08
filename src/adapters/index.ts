import { GeminiAdapter } from './gemini';
import { CodexAdapter } from './codex';
import { ClaudeAdapter } from './claude';
import { OpencodeAdapter } from './opencode';
import { MockAdapter } from './MockAdapter';
import { adapterRegistry } from './registry';

export const registerBuiltInAdapters = (): void => {
  if (!adapterRegistry.has('gemini')) {
    adapterRegistry.register('gemini', GeminiAdapter);
  }
  if (!adapterRegistry.has('codex')) {
    adapterRegistry.register('codex', CodexAdapter);
  }
  if (!adapterRegistry.has('claude')) {
    adapterRegistry.register('claude', ClaudeAdapter);
  }
  if (!adapterRegistry.has('opencode')) {
    adapterRegistry.register('opencode', OpencodeAdapter);
  }
  if (!adapterRegistry.has('mock')) {
    adapterRegistry.register('mock', MockAdapter, {
      displayName: 'Mock Adapter',
      icon: 'adapter',
      supportedModes: ['interactive', 'headless'],
    });
  }
};
