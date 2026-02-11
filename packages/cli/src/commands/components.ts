import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../utils/config.js';
import { RegistryClient } from '../registry/client.js';

export function registerComponentsCommand(program: Command) {
  program
    .command('components')
    .description('List available components')
    .action(async () => {
      const config = loadConfig(process.cwd());
      const client = new RegistryClient(config?.registry);
      const components = await client.getComponents(config?.framework);

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
