import { readFileSync } from 'fs';

export type PatternDefinition = {
  pattern: string;
  description?: string;
  flags?: string;
};

export type PatternSchema = {
  states: Record<string, PatternDefinition>;
};

export type CompiledPattern = {
  name: string;
  description?: string;
  source: string;
  regex: RegExp;
};

export type PatternLoadResult = {
  patterns: CompiledPattern[];
  errors: string[];
};

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const PatternLoader = {
  loadFromFile(filePath: string): PatternLoadResult {
    let raw: string;

    try {
      raw = readFileSync(filePath, 'utf8');
    } catch (error) {
      return {
        patterns: [],
        errors: [`Failed to read ${filePath}: ${formatError(error)}`],
      };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return {
        patterns: [],
        errors: [`Failed to parse JSON in ${filePath}: ${formatError(error)}`],
      };
    }

    return PatternLoader.loadFromObject(parsed, filePath);
  },

  loadFromObject(data: unknown, sourceLabel = 'pattern data'): PatternLoadResult {
    const patterns: CompiledPattern[] = [];
    const errors: string[] = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        patterns,
        errors: [`Invalid ${sourceLabel}: expected an object.`],
      };
    }

    const states = (data as { states?: unknown }).states;

    if (!states || typeof states !== 'object' || Array.isArray(states)) {
      return {
        patterns,
        errors: [`Invalid ${sourceLabel}: "states" must be an object.`],
      };
    }

    for (const [name, value] of Object.entries(states)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(
          `Invalid state "${name}" in ${sourceLabel}: expected an object.`,
        );
        continue;
      }

      const { pattern, description, flags } = value as {
        pattern?: unknown;
        description?: unknown;
        flags?: unknown;
      };

      if (typeof pattern !== 'string' || pattern.length === 0) {
        errors.push(
          `Invalid state "${name}" in ${sourceLabel}: "pattern" must be a non-empty string.`,
        );
        continue;
      }

      let regex: RegExp;

      try {
        regex = new RegExp(pattern, typeof flags === 'string' ? flags : undefined);
      } catch (error) {
        errors.push(
          `Invalid regex for state "${name}" in ${sourceLabel}: ${formatError(error)}`,
        );
        continue;
      }

      patterns.push({
        name,
        description: typeof description === 'string' ? description : undefined,
        source: pattern,
        regex,
      });
    }

    return { patterns, errors };
  },
};
