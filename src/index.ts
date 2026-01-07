export * from './orchestrator';

import { adapterRegistry } from './adapters/registry';
import type { ExecutionMode, ModesConfig } from './adapters/IAgentAdapter';
import { GeminiAdapter } from './adapters/gemini';
import { loadGeminiConfig } from './adapters/gemini/configLoader';

const resolveSupportedModes = (modes: ModesConfig): ExecutionMode[] =>
  (['interactive', 'headless'] as const).filter((mode) => !!modes[mode]);

const geminiConfig = loadGeminiConfig();

adapterRegistry.register('gemini', GeminiAdapter, {
  displayName: geminiConfig.metadata.displayName,
  icon: geminiConfig.metadata.icon,
  supportedModes: resolveSupportedModes(geminiConfig.modes),
});

export type { AgentLaunchConfig, IAgentAdapter } from './adapters/IAgentAdapter';
export { AdapterRegistry, adapterRegistry } from './adapters/registry';
export type { AdapterType } from './adapters/registry';
export { GeminiAdapter } from './adapters/gemini';
export { MockAdapter } from './adapters/MockAdapter';
export * from './adapters/PatternLoader';

export { AgentRunner } from './core/AgentRunner';
export { HeadlessRunner } from './core/HeadlessRunner';
export { AnsiUtils } from './core/AnsiUtils';
export type { AgentEvent } from './core/AgentEvent';
