import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { AppConfig } from '../shared/config';
import type { IpcEventChannel, IpcEvents, WorkflowDefinition } from '../shared/ipc-types';

type EventListener<E extends IpcEventChannel> = (payload: IpcEvents[E]) => void;
type Unsubscribe = () => void;

const electronAPI = {
  workflow: {
    execute: (workflow: WorkflowDefinition) =>
      ipcRenderer.invoke('workflow:execute', workflow) as Promise<string>,
    stop: () => ipcRenderer.invoke('workflow:stop') as Promise<void>,
  },
  task: {
    interact: (taskId: string, input: string) =>
      ipcRenderer.invoke('task:interact', taskId, input) as Promise<void>,
    resize: (taskId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('task:resize', taskId, cols, rows) as Promise<void>,
    complete: (taskId: string) =>
      ipcRenderer.invoke('task:complete', taskId) as Promise<void>,
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
