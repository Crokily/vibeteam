require('ts-node/register/transpile-only');

const { app, BrowserWindow, ipcMain } = require('electron');
const { EventEmitter } = require('events');
const path = require('path');

const {
  initOrchestrator,
  shutdownOrchestrator,
  getOrchestrator,
} = require('../electron/main/orchestrator');
const { adapterRegistry } = require('../src/adapters/registry');

class IpcTestAdapter extends EventEmitter {
  constructor() {
    super();
    this.name = 'ipc-test';
  }

  getLaunchConfig(_mode, prompt) {
    setTimeout(() => {
      this.emit('interactionNeeded', 'Need input');
    }, 0);

    const safePrompt = JSON.stringify(prompt ?? 'hello');
    const script = `console.log(${safePrompt}); setTimeout(() => { console.log('done'); }, 25);`;
    return {
      command: process.execPath,
      args: ['-e', script],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
      name: 'xterm-color',
    };
  }
}

if (!adapterRegistry.has('ipc-test')) {
  adapterRegistry.register('ipc-test', IpcTestAdapter);
}

const requiredChannels = [
  'orchestrator:stateChange',
  'orchestrator:taskStatusChange',
  'orchestrator:taskOutput',
  'orchestrator:interactionNeeded',
  'orchestrator:error',
];

const workflow = {
  id: 'ipc-verify-workflow',
  goal: 'ipc verification',
  stages: [
    {
      id: 'stage-1',
      tasks: [
        {
          id: 'task-1',
          adapter: 'ipc-test',
          executionMode: 'headless',
          prompt: 'ipc test run',
        },
      ],
    },
  ],
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let handlersRegistered = false;

const registerWorkflowHandlers = () => {
  if (handlersRegistered) {
    return;
  }

  ipcMain.handle('workflow:execute', async (_event, definition) => {
    console.log('[ipc-smoke] workflow:execute invoked.');
    const session = await getOrchestrator().executeWorkflow(definition);
    console.log('[ipc-smoke] workflow:execute resolved.');
    return session.id;
  });

  ipcMain.handle('workflow:stop', async (_event, sessionId) => {
    getOrchestrator().removeSession(sessionId);
  });

  ipcMain.handle('task:interact', async (_event, sessionId, taskId, input) => {
    getOrchestrator().submitInteraction(sessionId, taskId, input);
  });

  ipcMain.handle('task:complete', async (_event, sessionId, taskId) => {
    getOrchestrator().completeTask(sessionId, taskId);
  });

  handlersRegistered = true;
};

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../out/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadFile(path.join(__dirname, '../out/renderer/index.html'));
  return mainWindow;
};

const run = async () => {
  const timeout = setTimeout(() => {
    console.error('IPC smoke test timed out.');
    process.exitCode = 1;
    shutdownOrchestrator();
    app.quit();
  }, 30000);

  console.log('[ipc-smoke] Creating window...');
  const mainWindow = await createWindow();
  console.log('[ipc-smoke] Registering IPC handlers...');
  registerWorkflowHandlers();
  console.log('[ipc-smoke] Initializing orchestrator...');
  const orchestrator = initOrchestrator(mainWindow);
  orchestrator.on('stateChange', (payload) => {
    console.log(
      `[ipc-smoke] stateChange: ${payload.from} -> ${payload.to}`,
    );
  });
  orchestrator.on('taskStatusChange', (payload) => {
    console.log(
      `[ipc-smoke] taskStatusChange: ${payload.taskId} -> ${payload.status}`,
    );
  });
  orchestrator.on('interactionNeeded', (payload) => {
    console.log(`[ipc-smoke] interactionNeeded: ${payload.taskId}`);
  });
  orchestrator.on('taskOutput', () => {
    console.log('[ipc-smoke] Main received taskOutput event.');
  });
  orchestrator.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[ipc-smoke] orchestrator error: ${message}`);
  });

  console.log('[ipc-smoke] Wiring renderer listeners...');
  await mainWindow.webContents.executeJavaScript(
    `(() => {
      window.__ipcEvents = [];
      const channels = ${JSON.stringify(requiredChannels)};
      channels.forEach((channel) => {
        window.electronAPI.events.on(channel, (payload) => {
          window.__ipcEvents.push({ channel, payload });
        });
      });
    })();`,
  );

  console.log('[ipc-smoke] Executing workflow...');
  await mainWindow.webContents.executeJavaScript(
    `window.electronAPI.workflow.execute(${JSON.stringify(workflow)})`,
  );

  console.log('[ipc-smoke] Emitting error event...');
  getOrchestrator().emit('error', new Error('IPC error propagation test'));
  await delay(50);

  console.log('[ipc-smoke] Collecting events...');
  const events = await mainWindow.webContents.executeJavaScript(
    'window.__ipcEvents',
  );
  const counts = events.reduce((acc, event) => {
    acc[event.channel] = (acc[event.channel] ?? 0) + 1;
    return acc;
  }, {});

  const missing = requiredChannels.filter((channel) => !counts[channel]);
  console.log('IPC events captured:', counts);

  if (missing.length > 0) {
    console.error('Missing IPC events:', missing.join(', '));
    process.exitCode = 1;
  } else {
    console.log('IPC event smoke test passed.');
  }

  clearTimeout(timeout);
  shutdownOrchestrator();
  mainWindow.close();
  app.quit();
};

app.on('window-all-closed', () => {
  app.quit();
});

app
  .whenReady()
  .then(run)
  .catch((error) => {
    console.error('IPC smoke test failed:', error);
    process.exitCode = 1;
    shutdownOrchestrator();
    app.quit();
  });
