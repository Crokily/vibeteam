import { IAgentAdapter } from '../../adapters/IAgentAdapter';
import { AdapterEmitter, AdapterEmitterEvents } from '../types';

export const asEmitter = (adapter: IAgentAdapter): AdapterEmitter | null => {
  const candidate = adapter as unknown as AdapterEmitter;
  if (candidate && typeof candidate.on === 'function') {
    return candidate;
  }
  return null;
};

export const attachAdapterListeners = (
  emitter: AdapterEmitter,
  onInteractionNeeded: (payload?: unknown) => void,
  onAdapterStateChange: (...args: unknown[]) => void,
): void => {
  const handlers: Record<
    AdapterEmitterEvents,
    (...args: unknown[]) => void
  > = {
    interaction_needed: onInteractionNeeded,
    interactionNeeded: onInteractionNeeded,
    stateChange: onAdapterStateChange,
  };

  for (const [event, handler] of Object.entries(handlers) as Array<
    [AdapterEmitterEvents, (...args: unknown[]) => void]
  >) {
    emitter.on(event, handler);
  }
};

export const detachAdapterListeners = (
  emitter: AdapterEmitter,
  onInteractionNeeded: (payload?: unknown) => void,
  onAdapterStateChange: (...args: unknown[]) => void,
): void => {
  if (!emitter.off) {
    return;
  }

  const handlers: Record<
    AdapterEmitterEvents,
    (...args: unknown[]) => void
  > = {
    interaction_needed: onInteractionNeeded,
    interactionNeeded: onInteractionNeeded,
    stateChange: onAdapterStateChange,
  };

  for (const [event, handler] of Object.entries(handlers) as Array<
    [AdapterEmitterEvents, (...args: unknown[]) => void]
  >) {
    emitter.off(event, handler);
  }
};
