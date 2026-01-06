require('ts-node/register/transpile-only');

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  initOrchestrator,
  shutdownOrchestrator,
  getOrchestrator,
} = require('../electron/main/orchestrator');
const { SessionManager } = require('../src/orchestrator/state/SessionManager');
const { adapterRegistry } = require('../src/adapters/registry');
const { EventEmitter } = require('events');

// --- 1. Setup Test Environment ---
const TEST_TMP_DIR = path.join(__dirname, 'e2e-tmp-data');
if (fs.existsSync(TEST_TMP_DIR)) {
  fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_TMP_DIR);

// Override userData to isolate test
app.setPath('userData', TEST_TMP_DIR);

// --- 2. Mock Adapter ---
class E2ETestAdapter extends EventEmitter {
  constructor() {
    super();
    this.name = 'e2e-test';
  }
  getLaunchConfig() {
    // A dummy task that finishes immediately
    return {
      command: process.execPath,
      args: ['-e', 'console.log("done")'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    };
  }
}
if (!adapterRegistry.has('e2e-test')) {
  adapterRegistry.register('e2e-test', E2ETestAdapter);
}

// --- 3. IPC Handlers (Mirroring electron/main/ipc/handlers.ts) ---
const registerHandlers = () => {
  // Common resolve logic
  const resolveBaseDir = () => app.getPath('userData');

  // Workflow: Execute
  ipcMain.handle('workflow:execute', async (_event, workflow) => {
    const orchestrator = getOrchestrator();
    const baseDir = resolveBaseDir();
    // Simulate what the real handler does
    const session = await orchestrator.executeWorkflow(workflow, { baseDir });
    return session.id;
  });

  // Session: List
  ipcMain.handle('session:list', async () => {
    const baseDir = resolveBaseDir();
    const sessionsDir = SessionManager.getSessionDir(baseDir);
    if (!fs.existsSync(sessionsDir)) return [];
    
    // Simple implementation for test
    const entries = fs.readdirSync(sessionsDir).filter((e) => e.endsWith('.json'));
    const summaries = [];
    for (const entry of entries) {
      const sessionId = path.basename(entry, '.json');
      const manager = SessionManager.load(sessionId, { baseDir });
      const s = manager.getSession();
      summaries.push({
        id: s.id,
        goal: s.goal,
        status: 'DONE', // Simplified
        startedAt: s.startTime.toISOString(),
        updatedAt: new Date().toISOString(),
        hasWorkflowDefinition: !!s.workflowDefinition
      });
    }
    return summaries;
  });

  // Session: Resume
  ipcMain.handle('session:resume', async (_event, sessionId) => {
    const baseDir = resolveBaseDir();
    const manager = SessionManager.load(sessionId, { baseDir });
    const session = manager.getSession();
    if (!session.workflowDefinition) throw new Error('No definition');
    
    const orchestrator = getOrchestrator();
    const resumedSession = await orchestrator.executeWorkflow(session.workflowDefinition, {
      sessionId,
      baseDir
    });
    return resumedSession.id;
  });
};

// --- 4. Test Scenario ---
const runTest = async () => {
  console.log('[E2E] Starting Electron app...');
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../out/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await win.loadFile(path.join(__dirname, '../out/renderer/index.html'));

  registerHandlers();
  initOrchestrator(win);

  // Define a test workflow
  const workflow = {
    id: 'e2e-session-wf',
    goal: 'verify persistence',
    stages: [{
      id: 's1',
      tasks: [{ id: 't1', adapter: 'e2e-test', prompt: 'run' }]
    }]
  };

  console.log('[E2E] Step 1: Executing initial workflow...');
  const sessionId = await win.webContents.executeJavaScript(
    `window.electronAPI.workflow.execute(${JSON.stringify(workflow)})`
  );
  console.log(`[E2E] Workflow finished. Session ID: ${sessionId}`);

  // Verify file exists on disk
  const sessionPath = path.join(TEST_TMP_DIR, '.vibeteam', 'sessions', `${sessionId}.json`);
  if (!fs.existsSync(sessionPath)) {
    throw new Error('Session file not created on disk!');
  }
  console.log('[E2E] Verified: Session file exists on disk.');

  console.log('[E2E] Step 2: Listing sessions via IPC...');
  const sessions = await win.webContents.executeJavaScript(
    `window.electronAPI.session.list()`
  );
  const match = sessions.find(s => s.id === sessionId);
  if (!match) {
    throw new Error('Session not found in session:list result!');
  }
  if (!match.hasWorkflowDefinition) {
    throw new Error('Session summary reports missing workflowDefinition!');
  }
  console.log('[E2E] Verified: Session listed correctly.');

  console.log('[E2E] Step 3: Resuming session via IPC...');
  const resumedId = await win.webContents.executeJavaScript(
    `window.electronAPI.session.resume('${sessionId}')`
  );
  
  if (resumedId !== sessionId) {
    throw new Error(`Resumed session ID mismatch! Expected ${sessionId}, got ${resumedId}`);
  }
  console.log('[E2E] Verified: Session resumed successfully.');

  console.log('[E2E] Test PASSED.');
  shutdownOrchestrator();
  app.quit();
};

app.whenReady().then(runTest).catch(err => {
  console.error('[E2E] FAILED:', err);
  process.exit(1);
});
