export * from './orchestrator';

import { adapterRegistry } from './adapters/registry';
import { GeminiAdapter } from './adapters/gemini';

adapterRegistry.register('gemini', GeminiAdapter);

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
