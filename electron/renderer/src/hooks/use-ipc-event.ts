import { useEffect, useRef } from 'react';
import type { IpcEventChannel, IpcEvents } from '../../../shared/ipc-types';

export const useIpcEvent = <E extends IpcEventChannel>(
  channel: E,
  handler: (payload: IpcEvents[E]) => void
): void => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!window.electronAPI) {
      return undefined;
    }

    const unsubscribe = window.electronAPI.events.on(channel, (payload) => {
      handlerRef.current(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [channel]);
};
