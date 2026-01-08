import { createCLIAdapter, type CLIAdapterOptions } from '../base/AdapterFactory';
import embeddedConfig from './config.json';

export type OpencodeAdapterOptions = CLIAdapterOptions;

export const OpencodeAdapter = createCLIAdapter({
  name: 'opencode',
  command: 'opencode',
  config: embeddedConfig,
});
