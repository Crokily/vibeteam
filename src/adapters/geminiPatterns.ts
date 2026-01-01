import * as path from 'path';

import { PatternLoadResult, PatternLoader } from './PatternLoader';
import geminiPatterns from './gemini-patterns.json';

export const loadGeminiPatterns = (patternsPath?: string): PatternLoadResult => {
  const candidates = resolvePatternPaths(patternsPath);
  const errors: string[] = [];

  for (const candidate of candidates) {
    const result = PatternLoader.loadFromFile(candidate);
    if (result.patterns.length > 0) {
      return result;
    }
    errors.push(...result.errors);
  }

  const fallback = PatternLoader.loadFromObject(
    geminiPatterns,
    'embedded gemini-patterns.json',
  );

  return {
    patterns: fallback.patterns,
    errors: [...errors, ...fallback.errors],
  };
};

const resolvePatternPaths = (patternsPath?: string): string[] => {
  if (patternsPath) {
    return [path.resolve(patternsPath)];
  }

  const cwd = process.cwd();
  return [
    path.join(cwd, 'src', 'adapters', 'gemini-patterns.json'),
    path.join(cwd, 'dist', 'adapters', 'gemini-patterns.json'),
    path.join(cwd, 'adapters', 'gemini-patterns.json'),
    path.join(cwd, 'gemini-patterns.json'),
  ];
};
