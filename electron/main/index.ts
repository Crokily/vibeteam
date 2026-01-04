import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { registerIpcHandlers } from './ipc';
import { initOrchestrator, shutdownOrchestrator } from './orchestrator';
import { registerWindowStateHandlers, resolveWindowOptions } from './window-state';

console.log('[Main] Starting Electron main process...');

const createWindow = (): BrowserWindow => {
  console.log('[Main] Creating window...');
  const { options, shouldMaximize } = resolveWindowOptions({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const mainWindow = new BrowserWindow(options);

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window ready to show');
    if (shouldMaximize) {
      mainWindow.maximize();
    }

    mainWindow.show();
  });

  registerWindowStateHandlers(mainWindow);
  initOrchestrator(mainWindow);

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  console.log(`[Main] Loading URL: ${devServerUrl || 'local file'}`);
  
  if (devServerUrl) {
    mainWindow
      .loadURL(devServerUrl)
      .catch((e) => console.error('[Main] Failed to load URL:', e));
  } else {
    mainWindow
      .loadFile(join(__dirname, '../renderer/index.html'))
      .catch((e) => console.error('[Main] Failed to load file:', e));
  }

  return mainWindow;
};

app.whenReady().then(() => {
  console.log('[Main] App ready');
  try {
    registerIpcHandlers();
    console.log('[Main] IPC handlers registered');
    createWindow();
  } catch (error) {
    console.error('[Main] Error during startup:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('[Main] All windows closed');
  shutdownOrchestrator();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
