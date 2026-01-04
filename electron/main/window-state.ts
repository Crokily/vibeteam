import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import { getConfig, setConfig } from './config-store';
import type { WindowState } from '../shared/config';

export const resolveWindowOptions = (
  fallback: BrowserWindowConstructorOptions
): { options: BrowserWindowConstructorOptions; shouldMaximize: boolean } => {
  const windowState = getConfig('windowState');
  const options: BrowserWindowConstructorOptions = {
    ...fallback,
    width: windowState.width ?? fallback.width,
    height: windowState.height ?? fallback.height,
  };

  if (typeof windowState.x === 'number') {
    options.x = windowState.x;
  }

  if (typeof windowState.y === 'number') {
    options.y = windowState.y;
  }

  return {
    options,
    shouldMaximize: Boolean(windowState.isMaximized),
  };
};

export const registerWindowStateHandlers = (window: BrowserWindow): void => {
  let saveTimeout: NodeJS.Timeout | null = null;

  const persistWindowState = () => {
    const bounds = window.getBounds();
    const nextState: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: window.isMaximized(),
    };

    setConfig('windowState', nextState);
  };

  const scheduleSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(persistWindowState, 200);
  };

  window.on('resize', scheduleSave);
  window.on('move', scheduleSave);
  window.on('close', persistWindowState);
};
