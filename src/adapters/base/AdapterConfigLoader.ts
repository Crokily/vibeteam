import * as path from 'path';
import { readFileSync } from 'fs';

import { ModesConfig } from '../IAgentAdapter';
import { PatternLoader, CompiledPattern, type AdapterMetadata } from '../PatternLoader';

export type AdapterConfig = {
  metadata?: {
    displayName?: string;
    icon?: string;
  };
  states?: Record<string, unknown>;
  modes?: ModesConfig;
};

export type ConfigLoadResult = {
  patterns: CompiledPattern[];
  modes: ModesConfig;
  metadata: AdapterMetadata;
  errors: string[];
};

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const loadAdapterConfig = (
  adapterName: string,
  embeddedConfig: unknown,
  configPath?: string,
): ConfigLoadResult => {
  const candidates = resolveConfigPaths(adapterName, configPath);
  const errors: string[] = [];

  for (const candidate of candidates) {
    const result = loadConfigFromFile(adapterName, candidate);
    if (result.patterns.length > 0 || Object.keys(result.modes).length > 0) {
      return result;
    }
    errors.push(...result.errors);
  }

  const fallback = loadConfigFromObject(
    adapterName,
    embeddedConfig,
    'embedded config.json',
  );

  return {
    patterns: fallback.patterns,
    modes: fallback.modes,
    metadata: fallback.metadata,
    errors: [...errors, ...fallback.errors],
  };
};

const loadConfigFromFile = (adapterName: string, filePath: string): ConfigLoadResult => {
  let raw: string;

  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (error) {
    return {
      patterns: [],
      modes: {},
      metadata: defaultMetadata(adapterName),
      errors: [`Failed to read ${filePath}: ${formatError(error)}`],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      patterns: [],
      modes: {},
      metadata: defaultMetadata(adapterName),
      errors: [`Failed to parse JSON in ${filePath}: ${formatError(error)}`],
    };
  }

  return loadConfigFromObject(adapterName, parsed, filePath);
};

const loadConfigFromObject = (
  adapterName: string,
  data: unknown,
  sourceLabel = 'config data',
): ConfigLoadResult => {
  const errors: string[] = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      patterns: [],
      modes: {},
      metadata: defaultMetadata(adapterName),
      errors: [`Invalid ${sourceLabel}: expected an object.`],
    };
  }

  const config = data as AdapterConfig;
  const metadataDefaults = defaultMetadata(adapterName);
  const patternResult = PatternLoader.loadFromObject(
    {
      states: config.states ?? {},
      metadata: config.metadata,
    },
    sourceLabel,
    { metadataDefaults },
  );

  errors.push(...patternResult.errors);

  const modes = loadModesConfig(config.modes, sourceLabel, errors);

  return {
    patterns: patternResult.patterns,
    modes,
    metadata: patternResult.metadata ?? metadataDefaults,
    errors,
  };
};

const loadModesConfig = (
  modesData: unknown,
  sourceLabel: string,
  errors: string[],
): ModesConfig => {
  if (!modesData || typeof modesData !== 'object' || Array.isArray(modesData)) {
    return {};
  }

  const modes: ModesConfig = {};
  const data = modesData as Record<string, unknown>;

  for (const modeName of ['interactive', 'headless'] as const) {
    const modeData = data[modeName];
    if (!modeData) continue;

    if (typeof modeData !== 'object' || Array.isArray(modeData)) {
      errors.push(`Invalid mode "${modeName}" in ${sourceLabel}: expected an object.`);
      continue;
    }

    const { baseArgs, promptPosition, promptFlag } = modeData as {
      baseArgs?: unknown;
      promptPosition?: unknown;
      promptFlag?: unknown;
    };

    if (!Array.isArray(baseArgs)) {
      errors.push(`Invalid mode "${modeName}" in ${sourceLabel}: "baseArgs" must be an array.`);
      continue;
    }

    if (promptPosition !== 'last' && promptPosition !== 'flag') {
      errors.push(
        `Invalid mode "${modeName}" in ${sourceLabel}: "promptPosition" must be "last" or "flag".`,
      );
      continue;
    }

    modes[modeName] = {
      baseArgs: baseArgs.filter((arg): arg is string => typeof arg === 'string'),
      promptPosition,
      promptFlag: typeof promptFlag === 'string' ? promptFlag : undefined,
    };
  }

  return modes;
};

const resolveConfigPaths = (adapterName: string, configPath?: string): string[] => {
  if (configPath) {
    return [path.resolve(configPath)];
  }

  const cwd = process.cwd();
  return [
    path.join(cwd, 'src', 'adapters', adapterName, 'config.json'),
    path.join(cwd, 'dist', 'adapters', adapterName, 'config.json'),
    path.join(cwd, 'adapters', adapterName, 'config.json'),
    path.join(cwd, adapterName, 'config.json'),
  ];
};

const defaultMetadata = (adapterName: string): AdapterMetadata => ({
  displayName: adapterName,
  icon: 'adapter',
});
