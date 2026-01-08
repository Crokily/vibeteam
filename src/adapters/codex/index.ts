import { createCLIAdapter, type CLIAdapterOptions } from '../base/AdapterFactory';
import embeddedConfig from './config.json';

export type CodexAdapterOptions = CLIAdapterOptions;

export const CodexAdapter = createCLIAdapter({
  name: 'codex',
  command: 'codex',
  config: embeddedConfig,
});
