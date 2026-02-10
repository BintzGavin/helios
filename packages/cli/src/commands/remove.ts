import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import path from 'path';
import fs from 'fs';
import { uninstallComponent } from '../utils/uninstall.js';
import { loadConfig } from '../utils/config.js';
import { defaultClient } from '../registry/client.js';

export function registerRemoveCommand(program: Command) {
  program
    .command('remove <component>')
    .description('Remove a component from your project configuration')
    .option('-y, --yes', 'Skip confirmation')
    .option('--keep-files', 'Keep component files on disk')
    .action(async (component, options) => {
      try {
        if (options.keepFiles) {
          await uninstallComponent(process.cwd(), component, { removeFiles: false });
          return;
        }

        const config = loadConfig(process.cwd());

        // If config exists and component is installed, check for files to delete
        if (config && config.components.includes(component)) {
          const def = await defaultClient.findComponent(component, config.framework);

          if (def) {
            const componentsDir = path.resolve(process.cwd(), config.directories.components);
            const existingFiles = def.files.filter(file => fs.existsSync(path.join(componentsDir, file.name)));

            if (existingFiles.length > 0 && !options.yes) {
              console.log(chalk.yellow('\nThe following files will be deleted:'));
              existingFiles.forEach(file => {
                console.log(chalk.dim(`- ${path.join(config.directories.components, file.name)}`));
              });
              console.log('');

              const response = await prompts({
                type: 'confirm',
                name: 'value',
                message: 'Are you sure you want to delete these files?',
                initial: false
              });

              if (!response.value) {
                console.log(chalk.yellow('Cancelled removal.'));
                return;
              }
            }
          }
        }

        await uninstallComponent(process.cwd(), component, { removeFiles: true });
      } catch (error) {
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
