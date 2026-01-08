export * from './orchestrator';

import { adapterRegistry } from './adapters/registry';
import { GeminiAdapter } from './adapters/gemini';
import { CodexAdapter } from './adapters/codex';
import { ClaudeAdapter } from './adapters/claude';
import { OpencodeAdapter } from './adapters/opencode';

adapterRegistry.register('gemini', GeminiAdapter);
adapterRegistry.register('codex', CodexAdapter);
adapterRegistry.register('claude', ClaudeAdapter);
adapterRegistry.register('opencode', OpencodeAdapter);

export type { AgentLaunchConfig, IAgentAdapter } from './adapters/IAgentAdapter';
export { AdapterRegistry, adapterRegistry } from './adapters/registry';
export type { AdapterType } from './adapters/registry';
export { GeminiAdapter } from './adapters/gemini';
export { CodexAdapter } from './adapters/codex';
export { ClaudeAdapter } from './adapters/claude';
export { OpencodeAdapter } from './adapters/opencode';
export { MockAdapter } from './adapters/MockAdapter';
export * from './adapters/PatternLoader';

export { AgentRunner } from './core/AgentRunner';
export { HeadlessRunner } from './core/HeadlessRunner';
export { AnsiUtils } from './core/AnsiUtils';
export type { AgentEvent } from './core/AgentEvent';
