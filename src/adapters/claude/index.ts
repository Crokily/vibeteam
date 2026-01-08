import { createCLIAdapter, type CLIAdapterOptions } from '../base/AdapterFactory';
import embeddedConfig from './config.json';

export type ClaudeAdapterOptions = CLIAdapterOptions;

export const ClaudeAdapter = createCLIAdapter({
  name: 'claude',
  command: 'claude',
  config: embeddedConfig,
});
