import { createCLIAdapter, type CLIAdapterOptions } from '../base/AdapterFactory';
import embeddedConfig from './config.json';

export type GeminiAdapterOptions = CLIAdapterOptions;

export const GeminiAdapter = createCLIAdapter({
  name: 'gemini',
  command: 'gemini',
  config: embeddedConfig,
});
