import { execSync } from 'child_process';
import * as os from 'os';

let cachedEnv: NodeJS.ProcessEnv | null = null;

export function getShellEnv(): NodeJS.ProcessEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  // Only needed on macOS/Linux GUIs where PATH is stripped
  if (process.platform === 'win32') {
    cachedEnv = process.env;
    return cachedEnv;
  }

  try {
    const shell = process.env.SHELL || '/bin/bash';
    // Spawn a login shell and print the environment
    const stdout = execSync(`${shell} -ilc env`, { encoding: 'utf8' });
    
    const env = { ...process.env };
    
    for (const line of stdout.split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1];
        const value = match[2];
        // We prioritize the shell's environment for PATH and other critical vars
        if (key === 'PATH' || !env[key]) {
          env[key] = value;
        }
      }
    }
    
    cachedEnv = env;
  } catch (error) {
    console.warn('Failed to load shell environment, falling back to process.env', error);
    cachedEnv = process.env;
  }

  return cachedEnv;
}
