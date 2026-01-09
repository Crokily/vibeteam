import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { delimiter } from 'path';

const DEFAULT_PATHS: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: [
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/local/sbin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ],
  linux: ['/usr/local/sbin', '/usr/local/bin', '/usr/sbin', '/usr/bin', '/sbin', '/bin'],
};

const splitPath = (value: string): string[] =>
  value
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

const resolveShellPath = (): string | null => {
  if (process.platform === 'win32') {
    return null;
  }

  const candidates = [
    process.env.SHELL,
    '/bin/zsh',
    '/bin/bash',
    '/bin/sh',
  ].filter(Boolean) as string[];
  const shell = candidates.find((candidate) => existsSync(candidate));
  if (!shell) {
    return null;
  }

  try {
    const output = execFileSync(shell, ['-lc', 'printf "%s" "$PATH"'], {
      encoding: 'utf8',
    });
    return output.trim();
  } catch {
    return null;
  }
};

const mergePaths = (...sources: Array<string | undefined | null>): string => {
  const entries: string[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    if (!source) {
      continue;
    }
    for (const entry of splitPath(source)) {
      if (seen.has(entry)) {
        continue;
      }
      seen.add(entry);
      entries.push(entry);
    }
  }

  return entries.join(delimiter);
};

export const ensureProcessPath = (): void => {
  if (process.platform === 'win32') {
    return;
  }

  const current = process.env.PATH ?? '';
  const shellPath = resolveShellPath();
  const defaults = DEFAULT_PATHS[process.platform] ?? [];
  const merged = mergePaths(shellPath, current, defaults.join(delimiter));

  if (merged) {
    process.env.PATH = merged;
  }
};
