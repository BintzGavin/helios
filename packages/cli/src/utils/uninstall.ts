import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { loadConfig, saveConfig } from './config.js';
import { defaultClient } from '../registry/client.js';

export interface UninstallOptions {
  removeFiles?: boolean;
}

export async function uninstallComponent(rootDir: string, componentName: string, options: UninstallOptions = {}): Promise<void> {
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
    // Attempt to find files to warn user or delete them
    const component = await defaultClient.findComponent(componentName, config.framework);

    if (component) {
      const componentsDir = path.resolve(rootDir, config.directories.components);

      if (options.removeFiles) {
        console.log(chalk.cyan(`\nDeleting component files...`));
        for (const file of component.files) {
          const filePath = path.join(componentsDir, file.name);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(chalk.dim(`✓ Deleted ${path.join(config.directories.components, file.name)}`));

              // Try to remove empty parent directories
              let dir = path.dirname(filePath);
              while (dir !== componentsDir && dir.startsWith(componentsDir)) {
                if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
                  fs.rmdirSync(dir);
                  dir = path.dirname(dir);
                } else {
                  break;
                }
              }
            } catch (e) {
              console.warn(chalk.yellow(`⚠ Failed to delete ${file.name}: ${(e as Error).message}`));
            }
          }
        }
        console.log(chalk.green(`✓ Component files removed.`));
      } else {
        console.log(chalk.yellow('\nThe following files are no longer tracked and can be safely deleted:'));

        for (const file of component.files) {
          // Just show relative path to be cleaner for user
          const relPath = path.join(config.directories.components, file.name);
          console.log(chalk.dim(`- ${relPath}`));
        }
        console.log('');
      }
    } else {
       console.log(chalk.yellow(`\nCould not find component "${componentName}" in registry to verify files.`));
    }
  } catch (error) {
    console.log(chalk.yellow(`\nCould not verify associated files: ${(error as Error).message}`));
  }
}
