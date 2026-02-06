import path from 'path';
import chalk from 'chalk';
import { loadConfig, saveConfig } from './config.js';
import { defaultClient } from '../registry/client.js';

export async function uninstallComponent(rootDir: string, componentName: string): Promise<void> {
  const config = loadConfig(rootDir);

  if (!config) {
    throw new Error('No helios.config.json found. Please run this command from the root of your project.');
  }

  if (!config.components.includes(componentName)) {
    throw new Error(`Component "${componentName}" is not installed.`);
  }

  // Remove component from config
  config.components = config.components.filter(c => c !== componentName);
  saveConfig(config, rootDir);

  console.log(chalk.green(`✓ Removed "${componentName}" from configuration.`));

  try {
    // Attempt to find files to warn user
    const component = await defaultClient.findComponent(componentName, config.framework);

    if (component) {
      const componentsDir = path.resolve(rootDir, config.directories.components);
      console.log(chalk.yellow('\nThe following files are no longer tracked and can be safely deleted:'));

      for (const file of component.files) {
        // Just show relative path to be cleaner for user
        const relPath = path.join(config.directories.components, file.name);
        console.log(chalk.dim(`- ${relPath}`));
      }
      console.log('');
    } else {
       console.log(chalk.yellow(`\nCould not find component "${componentName}" in registry to verify files.`));
    }
  } catch (error) {
    console.log(chalk.yellow(`\nCould not verify associated files: ${(error as Error).message}`));
  }
}
