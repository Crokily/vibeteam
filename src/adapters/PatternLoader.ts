import { readFileSync } from 'fs';

export type PatternDefinition = {
  pattern: string;
  description?: string;
  flags?: string;
};

export type AdapterMetadata = {
  displayName: string;
  icon: string;
};

export type PatternLoaderOptions = {
  metadataDefaults?: AdapterMetadata;
};

export type PatternSchema = {
  metadata?: {
    displayName?: string;
    icon?: string;
  };
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
  metadata?: AdapterMetadata;
  errors: string[];
};

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const resolveMetadata = (
  data: unknown,
  sourceLabel: string,
  defaults?: AdapterMetadata,
  errors: string[] = [],
): AdapterMetadata | undefined => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return defaults;
  }

  const metadataValue = (data as { metadata?: unknown }).metadata;

  if (metadataValue === undefined) {
    return defaults;
  }

  if (!metadataValue || typeof metadataValue !== 'object' || Array.isArray(metadataValue)) {
    errors.push(`Invalid ${sourceLabel}: "metadata" must be an object.`);
    return defaults;
  }

  const { displayName, icon } = metadataValue as {
    displayName?: unknown;
    icon?: unknown;
  };

  let resolvedDisplayName = defaults?.displayName;
  let resolvedIcon = defaults?.icon;

  if (displayName !== undefined) {
    if (typeof displayName !== 'string' || displayName.trim().length === 0) {
      errors.push(
        `Invalid ${sourceLabel}: "metadata.displayName" must be a non-empty string.`,
      );
    } else {
      resolvedDisplayName = displayName;
    }
  }

  if (icon !== undefined) {
    if (typeof icon !== 'string' || icon.trim().length === 0) {
      errors.push(
        `Invalid ${sourceLabel}: "metadata.icon" must be a non-empty string.`,
      );
    } else {
      resolvedIcon = icon;
    }
  }

  if (resolvedDisplayName && resolvedIcon) {
    return { displayName: resolvedDisplayName, icon: resolvedIcon };
  }

  return defaults;
};

export const PatternLoader = {
  loadFromFile(filePath: string, options?: PatternLoaderOptions): PatternLoadResult {
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

    return PatternLoader.loadFromObject(parsed, filePath, options);
  },

  loadFromObject(
    data: unknown,
    sourceLabel = 'pattern data',
    options?: PatternLoaderOptions,
  ): PatternLoadResult {
    const patterns: CompiledPattern[] = [];
    const errors: string[] = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        patterns,
        metadata: options?.metadataDefaults,
        errors: [`Invalid ${sourceLabel}: expected an object.`],
      };
    }

    const metadata = resolveMetadata(data, sourceLabel, options?.metadataDefaults, errors);
    const states = (data as { states?: unknown }).states;

    if (!states || typeof states !== 'object' || Array.isArray(states)) {
      return {
        patterns,
        metadata,
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

    return { patterns, metadata, errors };
  },
};
