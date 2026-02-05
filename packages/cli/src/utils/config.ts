import fs from 'fs';
import path from 'path';

export interface HeliosConfig {
  version: string;
  directories: {
    components: string;
    lib: string;
  };
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'vanilla';
  components: string[];
}

export const DEFAULT_CONFIG: HeliosConfig = {
  version: '1.0.0',
  directories: {
    components: 'src/components/helios',
    lib: 'src/lib',
  },
  components: [],
};

export function loadConfig(cwd: string = process.cwd()): HeliosConfig | null {
  const configPath = path.resolve(cwd, 'helios.config.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    // TODO: Add validation here
    return config as HeliosConfig;
  } catch (error) {
    throw new Error(`Failed to parse helios.config.json: ${(error as Error).message}`);
  }
}

export function saveConfig(config: HeliosConfig, cwd: string = process.cwd()): void {
  const configPath = path.resolve(cwd, 'helios.config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new Error(`Failed to save helios.config.json: ${(error as Error).message}`);
  }
}
