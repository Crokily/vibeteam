import type { AppConfig } from '../../../shared/config';
import type {
  AdapterMeta,
  IpcEventChannel,
  IpcEvents,
  SessionSummary,
  WorkflowDefinition,
  WorkflowSessionSnapshot,
} from '../../../shared/ipc-types';

type EventListener<E extends IpcEventChannel> = (payload: IpcEvents[E]) => void;

declare global {
  interface Window {
    electronAPI: {
      workflow: {
        execute: (workflow: WorkflowDefinition) => Promise<string>;
        stop: (sessionId: string) => Promise<void>;
      };
      task: {
        interact: (sessionId: string, taskId: string, input: string) => Promise<void>;
        resize: (
          sessionId: string,
          taskId: string,
          cols: number,
          rows: number
        ) => Promise<void>;
        complete: (sessionId: string, taskId: string) => Promise<void>;
      };
      adapter: {
        list: () => Promise<AdapterMeta[]>;
      };
      session: {
        list: () => Promise<SessionSummary[]>;
        load: (sessionId: string) => Promise<WorkflowSessionSnapshot>;
        resume: (sessionId: string) => Promise<string>;
        delete: (sessionId: string) => Promise<void>;
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
