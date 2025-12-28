import * as pty from 'node-pty';
import * as os from 'os';

const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh';

console.log(`Spawning shell: ${shell}`);

const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env,
});

ptyProcess.onData((data) => {
  process.stdout.write(`[PTY]: ${data}`);
});

console.log('Sending command: ls -la');
ptyProcess.write('ls -la\r');

// Give it a moment to run and then exit
setTimeout(() => {
  console.log('Exiting PoC...');
  ptyProcess.kill();
}, 2000);
