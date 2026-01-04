import { BrowserWindow, ipcMain } from 'electron';
import type {
  IpcCommandArgs,
  IpcCommandChannel,
  IpcEventChannel,
  IpcEventPayload,
} from '../../shared/ipc-types';
import { ipcCommandSchemas, ipcEventSchemas } from '../../shared/ipc-schemas';
import { commandHandlers } from './handlers';

let isRegistered = false;

const channels = Object.keys(commandHandlers) as IpcCommandChannel[];

const parseArgs = <C extends IpcCommandChannel>(
  channel: C,
  args: unknown[]
): IpcCommandArgs<C> => {
  const schema = ipcCommandSchemas[channel];
  return schema.parse(args) as IpcCommandArgs<C>;
};

export const registerIpcHandlers = (): void => {
  if (isRegistered) {
    return;
  }

  channels.forEach((channel) => {
    ipcMain.handle(channel, async (_event, ...args) => {
      const parsedArgs = parseArgs(channel, args);
      const handler = commandHandlers[channel];
      return handler(...parsedArgs);
    });
  });

  isRegistered = true;
};

export const sendIpcEvent = <E extends IpcEventChannel>(
  channel: E,
  payload: IpcEventPayload<E>
): void => {
  const parsedPayload = ipcEventSchemas[channel].parse(payload) as IpcEventPayload<E>;

  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(channel, parsedPayload);
  });
};
