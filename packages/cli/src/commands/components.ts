import { Command } from 'commander';
import chalk from 'chalk';
import { defaultClient } from '../registry/client.js';

export function registerComponentsCommand(program: Command) {
  program
    .command('components')
    .description('List available components')
    .action(async () => {
      const components = await defaultClient.getComponents();

      if (components.length === 0) {
        console.log(chalk.yellow('No components found in registry.'));
        return;
      }

      console.log(chalk.bold('Available components:'));
      for (const component of components) {
        console.log(` - ${chalk.cyan(component.name)} ${chalk.gray(`(${component.type})`)}`);
      }
    });
}
