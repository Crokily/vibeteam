import { z } from 'zod';

export const windowStateSchema = z
  .object({
    x: z.number().int().optional(),
    y: z.number().int().optional(),
    width: z.number().int().min(640).optional(),
    height: z.number().int().min(480).optional(),
    isMaximized: z.boolean().optional(),
  })
  .strict();

const themeValues = ['system', 'light', 'dark'] as const;
export const themeSchema = z.enum(themeValues);

export const appConfigSchema = z
  .object({
    windowState: windowStateSchema.default({}),
    adapterType: z.string().min(1),
    theme: themeSchema.default('system'),
    recentWorkflows: z.array(z.string()).default([]),
  })
  .strict();

export type AppConfig = z.infer<typeof appConfigSchema>;
export type WindowState = z.infer<typeof windowStateSchema>;

export const appConfigKeySchema = appConfigSchema.keyof();

export const defaultConfig: AppConfig = {
  windowState: {},
  adapterType: 'local',
  theme: 'system',
  recentWorkflows: [],
};
