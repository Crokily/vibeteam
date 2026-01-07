export * from './orchestrator';

import { adapterRegistry } from './adapters/registry';
import type { ExecutionMode, ModesConfig } from './adapters/IAgentAdapter';
import { GeminiAdapter } from './adapters/gemini';
import { loadAdapterConfig } from './adapters/base/AdapterConfigLoader';
import geminiEmbeddedConfig from './adapters/gemini/config.json';
import { CodexAdapter } from './adapters/codex';
import codexEmbeddedConfig from './adapters/codex/config.json';

const resolveSupportedModes = (modes: ModesConfig): ExecutionMode[] =>
  (['interactive', 'headless'] as const).filter((mode) => !!modes[mode]);

const geminiConfig = loadAdapterConfig('gemini', geminiEmbeddedConfig);
const codexConfig = loadAdapterConfig('codex', codexEmbeddedConfig);

adapterRegistry.register('gemini', GeminiAdapter, {
  displayName: geminiConfig.metadata.displayName,
  icon: geminiConfig.metadata.icon,
  supportedModes: resolveSupportedModes(geminiConfig.modes),
});
adapterRegistry.register('codex', CodexAdapter, {
  displayName: codexConfig.metadata.displayName,
  icon: codexConfig.metadata.icon,
  supportedModes: resolveSupportedModes(codexConfig.modes),
});

export type { AgentLaunchConfig, IAgentAdapter } from './adapters/IAgentAdapter';
export { AdapterRegistry, adapterRegistry } from './adapters/registry';
export type { AdapterType } from './adapters/registry';
export { GeminiAdapter } from './adapters/gemini';
export { CodexAdapter } from './adapters/codex';
export { MockAdapter } from './adapters/MockAdapter';
export * from './adapters/PatternLoader';

export { AgentRunner } from './core/AgentRunner';
export { HeadlessRunner } from './core/HeadlessRunner';
export { AnsiUtils } from './core/AnsiUtils';
export type { AgentEvent } from './core/AgentEvent';
