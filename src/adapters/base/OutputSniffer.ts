import { CompiledPattern } from '../PatternLoader';

export type AdapterState = {
  name: string;
  description?: string;
};

export type SniffResult = {
  newState: AdapterState | null;
  match: CompiledPattern | null;
};

export class OutputSniffer {
  private buffer = '';
  private readonly bufferSize: number;
  private readonly patterns: CompiledPattern[];

  constructor(patterns: CompiledPattern[], bufferSize = 4096) {
    this.patterns = patterns;
    this.bufferSize = bufferSize;
  }

  sniff(chunk: string): SniffResult | null {
    if (!chunk || this.patterns.length === 0) {
      return null;
    }

    // Normalize: CRLF -> LF, CR -> LF
    const normalized = chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    this.buffer += normalized;

    if (this.buffer.length > this.bufferSize) {
      this.buffer = this.buffer.slice(-this.bufferSize);
    }

    for (const pattern of this.patterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(this.buffer)) {
        return {
          newState: {
            name: pattern.name,
            description: pattern.description,
          },
          match: pattern,
        };
      }
    }

    return null;
  }

  reset(): void {
    this.buffer = '';
  }
}
