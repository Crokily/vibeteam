import Store from 'electron-store';
import {
  appConfigKeySchema,
  appConfigSchema,
  defaultConfig,
  type AppConfig,
} from '../shared/config';
import { appConfigValueSchemas } from '../shared/ipc-schemas';

const store = new Store<AppConfig>({
  defaults: defaultConfig,
});

export const getConfig = <K extends keyof AppConfig>(key: K): AppConfig[K] => {
  const parsedKey = appConfigKeySchema.parse(key);
  const value = store.get(parsedKey);
  return appConfigSchema.shape[parsedKey].parse(value);
};

export const setConfig = <K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): void => {
  const parsedKey = appConfigKeySchema.parse(key);
  const schema = appConfigValueSchemas[parsedKey];
  const parsedValue = schema.parse(value) as AppConfig[K];
  store.set(parsedKey, parsedValue);
};
