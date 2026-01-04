import { ipcMain } from 'electron';
import type {
  IpcCommandArgs,
  IpcCommandChannel,
} from '../../shared/ipc-types';
import { ipcCommandSchemas } from '../../shared/ipc-schemas';
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
      const parsedArgs = parseArgs(channel, args) as unknown[];
      const handler = commandHandlers[channel] as (...handlerArgs: unknown[]) => unknown;
      return handler(...parsedArgs);
    });
  });

  isRegistered = true;
};

export { sendIpcEvent } from './events';
