import Store from 'electron-store';
import {
  appConfigKeySchema,
  defaultConfig,
  type AppConfig,
} from '../shared/config';
import { appConfigValueSchemas } from '../shared/ipc-schemas';

const store = new Store<AppConfig>({
  defaults: defaultConfig,
});

export const getConfig = <K extends keyof AppConfig>(key: K): AppConfig[K] => {
  const parsedKey = appConfigKeySchema.parse(key) as K;
  const value = store.get(parsedKey);
  const schema = appConfigValueSchemas[parsedKey];
  return schema.parse(value);
};

export const setConfig = <K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): void => {
  const parsedKey = appConfigKeySchema.parse(key) as K;
  const schema = appConfigValueSchemas[parsedKey];
  const parsedValue = schema.parse(value);
  store.set(parsedKey, parsedValue);
};
