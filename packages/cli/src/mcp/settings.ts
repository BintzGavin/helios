import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export const X264_PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow', 'placebo'] as const;

export const SettingsSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fps: z.number().int().positive().optional(),
  preset: z.enum(X264_PRESETS).optional(),
  outputFolder: z.string().optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;

const SETTINGS_FILE = '.helios/mcp-settings.json';

export async function getSettings(root: string): Promise<Settings> {
  try {
    const settingsPath = path.join(root, SETTINGS_FILE);
    if (!fs.existsSync(settingsPath)) return {};
    const content = await fs.promises.readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(content);
    const result = SettingsSchema.safeParse(parsed);
    if (result.success) return result.data;
    return {};
  } catch (err) {
    return {};
  }
}

export async function updateSettings(root: string, settings: Partial<Settings>): Promise<Settings> {
  const current = await getSettings(root);
  const updated = { ...current, ...settings };
  const settingsPath = path.join(root, SETTINGS_FILE);
  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}
