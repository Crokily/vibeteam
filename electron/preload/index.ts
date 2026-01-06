import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { AppConfig } from '../shared/config';
import type {
  IpcEventChannel,
  IpcEvents,
  SessionSummary,
  WorkflowDefinition,
  WorkflowSessionSnapshot,
} from '../shared/ipc-types';

type EventListener<E extends IpcEventChannel> = (payload: IpcEvents[E]) => void;
type Unsubscribe = () => void;

const electronAPI = {
  workflow: {
    execute: (workflow: WorkflowDefinition) =>
      ipcRenderer.invoke('workflow:execute', workflow) as Promise<string>,
    stop: (sessionId: string) =>
      ipcRenderer.invoke('workflow:stop', sessionId) as Promise<void>,
  },
  task: {
    interact: (sessionId: string, taskId: string, input: string) =>
      ipcRenderer.invoke('task:interact', sessionId, taskId, input) as Promise<void>,
    resize: (sessionId: string, taskId: string, cols: number, rows: number) =>
      ipcRenderer.invoke(
        'task:resize',
        sessionId,
        taskId,
        cols,
        rows
      ) as Promise<void>,
    complete: (sessionId: string, taskId: string) =>
      ipcRenderer.invoke('task:complete', sessionId, taskId) as Promise<void>,
  },
  session: {
    list: () => ipcRenderer.invoke('session:list') as Promise<SessionSummary[]>,
    load: (sessionId: string) =>
      ipcRenderer.invoke('session:load', sessionId) as Promise<WorkflowSessionSnapshot>,
    resume: (sessionId: string) =>
      ipcRenderer.invoke('session:resume', sessionId) as Promise<string>,
    delete: (sessionId: string) =>
      ipcRenderer.invoke('session:delete', sessionId) as Promise<void>,
  },
  config: {
    get: <K extends keyof AppConfig>(key: K) =>
      ipcRenderer.invoke('config:get', key) as Promise<AppConfig[K]>,
    set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
      ipcRenderer.invoke('config:set', key, value) as Promise<void>,
  },
  events: {
    on: <E extends IpcEventChannel>(channel: E, listener: EventListener<E>): Unsubscribe => {
      const wrappedListener = (_event: IpcRendererEvent, payload: IpcEvents[E]) => {
        listener(payload);
      };

      ipcRenderer.on(channel, wrappedListener);

      return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
      };
    },
  },
} as const;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
