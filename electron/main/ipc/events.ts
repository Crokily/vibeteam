import { BrowserWindow } from 'electron';
import type { IpcEventChannel, IpcEventPayload } from '../../shared/ipc-types';
import { ipcEventSchemas } from '../../shared/ipc-schemas';

type IpcEventTargets = BrowserWindow | BrowserWindow[] | null | undefined;

const resolveTargets = (targets: IpcEventTargets): BrowserWindow[] => {
  if (targets === undefined) {
    return BrowserWindow.getAllWindows();
  }

  if (targets === null) {
    return [];
  }

  return Array.isArray(targets) ? targets : [targets];
};

export const sendIpcEvent = <E extends IpcEventChannel>(
  channel: E,
  payload: IpcEventPayload<E>,
  targets?: IpcEventTargets
): void => {
  const parsedPayload = ipcEventSchemas[channel].parse(payload) as IpcEventPayload<E>;
  const windows = resolveTargets(targets);

  windows.forEach((window) => {
    if (!window || window.isDestroyed()) {
      return;
    }

    window.webContents.send(channel, parsedPayload);
  });
};
