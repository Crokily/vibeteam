import * as fs from 'fs';
import * as path from 'path';

export type LogManager = {
  ensureLogStream: (taskId: string) => void;
  writeLog: (taskId: string, chunk: string) => void;
  getLogPath: (taskId: string) => string;
  closeAll: () => Promise<void>;
};

const DEFAULT_DENY_PATTERNS: RegExp[] = [
  /exception/i,
  /traceback/i,
  /\bpanic\b/i,
  /\bfatal\b/i,
  /\berror\s*:/i,
  /\bERROR\b/,
  /\bETIMEDOUT\b/,
  /unhandled/i,
  /timed out/i,
  /segmentation fault/i,
  /permission denied/i,
  /no such file or directory/i,
  /\u9519\u8bef\s*(?::|\uff1a)/, // "error:" in zh
  /\u5f02\u5e38\s*(?::|\uff1a)/, // "exception:" in zh
  /\u5931\u8d25\s*(?::|\uff1a)/, // "failed:" in zh
  /\u5d29\u6e83\s*(?::|\uff1a)/, // "crash:" in zh
];

export const ensureFile = (filePath: string, content: string): void => {
  if (fs.existsSync(filePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
};

export const resetFiles = (filePaths: string[]): void => {
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
};

export const createLogManager = (
  logsDir: string,
  options: { truncate?: boolean } = {},
): LogManager => {
  const streams = new Map<string, fs.WriteStream>();
  const truncate = options.truncate ?? false;

  const getLogPath = (taskId: string): string =>
    path.join(logsDir, `${taskId}.log`);

  const ensureLogStream = (taskId: string): void => {
    if (streams.has(taskId)) {
      return;
    }

    fs.mkdirSync(logsDir, { recursive: true });
    const logPath = getLogPath(taskId);
    if (truncate) {
      fs.writeFileSync(logPath, '');
    }
    const stream = fs.createWriteStream(logPath, { flags: 'a' });
    streams.set(taskId, stream);
  };

  const writeLog = (taskId: string, chunk: string): void => {
    if (!chunk) {
      return;
    }
    ensureLogStream(taskId);
    streams.get(taskId)?.write(chunk);
  };

  const closeAll = async (): Promise<void> => {
    await Promise.all(
      Array.from(streams.values()).map(
        (stream) =>
          new Promise<void>((resolve) => {
            stream.end(() => resolve());
          }),
      ),
    );
  };

  return { ensureLogStream, writeLog, getLogPath, closeAll };
};

export const assertFilesExist = (
  filePaths: string[],
  options: { requireNonEmpty?: boolean } = {},
): void => {
  const requireNonEmpty = options.requireNonEmpty ?? false;

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing output file: ${filePath}`);
    }

    if (requireNonEmpty) {
      const stat = fs.statSync(filePath);
      if (stat.size === 0) {
        throw new Error(`Output file is empty: ${filePath}`);
      }
    }
  }
};

export const assertLogsHealthy = (
  logPaths: string[],
  denyPatterns: RegExp[] = DEFAULT_DENY_PATTERNS,
): void => {
  for (const logPath of logPaths) {
    if (!fs.existsSync(logPath)) {
      throw new Error(`Missing log file: ${logPath}`);
    }

    const content = fs.readFileSync(logPath, 'utf8');
    for (const pattern of denyPatterns) {
      if (pattern.test(content)) {
        throw new Error(`Log contains error pattern (${pattern}): ${logPath}`);
      }
    }
  }
};

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};
