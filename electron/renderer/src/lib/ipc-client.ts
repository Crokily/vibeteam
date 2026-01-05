import type { AppConfig } from '../../../shared/config';
import type { WorkflowDefinition } from '../../../shared/ipc-types';

const getApi = () => {
  if (!window.electronAPI) {
    throw new Error('electronAPI is not available');
  }

  return window.electronAPI;
};

export const ipcClient = {
  workflow: {
    execute: (workflow: WorkflowDefinition) => getApi().workflow.execute(workflow),
    stop: () => getApi().workflow.stop(),
  },
  task: {
    interact: (taskId: string, input: string) =>
      getApi().task.interact(taskId, input),
    resize: (taskId: string, cols: number, rows: number) =>
      getApi().task.resize(taskId, cols, rows),
    complete: (taskId: string) => getApi().task.complete(taskId),
  },
  config: {
    get: <K extends keyof AppConfig>(key: K) => getApi().config.get(key),
    set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
      getApi().config.set(key, value),
  },
};
