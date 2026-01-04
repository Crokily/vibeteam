import type { AppConfig } from '../../../shared/config';
import type {
  IpcEventChannel,
  IpcEvents,
  WorkflowDefinition,
} from '../../../shared/ipc-types';

type EventListener<E extends IpcEventChannel> = (payload: IpcEvents[E]) => void;

declare global {
  interface Window {
    electronAPI: {
      workflow: {
        execute: (workflow: WorkflowDefinition) => Promise<string>;
        stop: () => Promise<void>;
      };
      task: {
        interact: (taskId: string, input: string) => Promise<void>;
        complete: (taskId: string) => Promise<void>;
      };
      config: {
        get: <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>;
        set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>;
      };
      events: {
        on: <E extends IpcEventChannel>(
          channel: E,
          listener: EventListener<E>
        ) => () => void;
      };
    };
  }
}

export {};
