import type { AppConfig } from '../../../shared/config';
import type {
  AdapterMeta,
  SessionSummary,
  WorkflowDefinition,
  WorkflowSessionSnapshot,
} from '../../../shared/ipc-types';

const getApi = () => {
  if (!window.electronAPI) {
    throw new Error('electronAPI is not available');
  }

  return window.electronAPI;
};

export const ipcClient = {
  workflow: {
    execute: (workflow: WorkflowDefinition) => getApi().workflow.execute(workflow),
    stop: (sessionId: string) => getApi().workflow.stop(sessionId),
  },
  task: {
    interact: (sessionId: string, taskId: string, input: string) =>
      getApi().task.interact(sessionId, taskId, input),
    resize: (sessionId: string, taskId: string, cols: number, rows: number) =>
      getApi().task.resize(sessionId, taskId, cols, rows),
    complete: (sessionId: string, taskId: string) =>
      getApi().task.complete(sessionId, taskId),
  },
  adapter: {
    list: (): Promise<AdapterMeta[]> => getApi().adapter.list(),
  },
  session: {
    list: (): Promise<SessionSummary[]> => getApi().session.list(),
    load: (sessionId: string): Promise<WorkflowSessionSnapshot> =>
      getApi().session.load(sessionId),
    resume: (sessionId: string): Promise<string> =>
      getApi().session.resume(sessionId),
    delete: (sessionId: string): Promise<void> =>
      getApi().session.delete(sessionId),
  },
  config: {
    get: <K extends keyof AppConfig>(key: K) => getApi().config.get(key),
    set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
      getApi().config.set(key, value),
  },
};
