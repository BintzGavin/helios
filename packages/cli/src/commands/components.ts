import { Command } from 'commander';
import chalk from 'chalk';
import { registry } from '../registry/manifest.js';

export function registerComponentsCommand(program: Command) {
  program
    .command('components')
    .description('List available components')
    .action(() => {
      if (registry.length === 0) {
        console.log(chalk.yellow('No components found in registry.'));
        return;
      }

      console.log(chalk.bold('Available components:'));
      for (const component of registry) {
        console.log(` - ${chalk.cyan(component.name)} ${chalk.gray(`(${component.type})`)}`);
      }
    });
}
