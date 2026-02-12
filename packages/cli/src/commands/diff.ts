import { Command } from 'commander';
import { createTwoFilesPatch } from 'diff';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../utils/config.js';
import { RegistryClient } from '../registry/client.js';

export function registerDiffCommand(program: Command) {
  program
    .command('diff <component>')
    .description('Compare local component with registry version')
    .action(async (componentName) => {
      const config = loadConfig();
      if (!config) {
        console.error(chalk.red('No helios.config.json found.'));
        process.exit(1);
      }

      const client = new RegistryClient(config.registry);
      const remoteComponent = await client.findComponent(componentName, config.framework);

      if (!remoteComponent) {
        console.error(chalk.red(`Component "${componentName}" not found in registry.`));
        process.exit(1);
      }

      const localBaseDir = path.resolve(process.cwd(), config.directories.components);
      let hasDiff = false;

      for (const file of remoteComponent.files) {
        const localPath = path.join(localBaseDir, file.name);

        if (fs.existsSync(localPath)) {
          const localContent = fs.readFileSync(localPath, 'utf-8');
          const remoteContent = file.content;

          if (localContent.replace(/\r\n/g, '\n').trim() !== remoteContent.replace(/\r\n/g, '\n').trim()) {
             const patch = createTwoFilesPatch(
               file.name,
               file.name,
               remoteContent,
               localContent,
               'Registry',
               'Local'
             );

             patch.split('\n').forEach(line => {
               if (line.startsWith('+') && !line.startsWith('+++')) {
                 console.log(chalk.green(line));
               } else if (line.startsWith('-') && !line.startsWith('---')) {
                 console.log(chalk.red(line));
               } else if (line.startsWith('@')) {
                 console.log(chalk.cyan(line));
               } else {
                 console.log(line);
               }
             });
             hasDiff = true;
          }
        } else {
          console.log(chalk.green(`New file in registry: ${file.name}`));
          hasDiff = true;
        }
      }

      if (!hasDiff) {
        console.log(chalk.gray('No differences found.'));
      }
    });
}
