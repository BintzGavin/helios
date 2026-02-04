import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../utils/config.js';

export function registerAddCommand(program: Command) {
  program
    .command('add <component>')
    .description('Add a component to your project')
    .action(async (component) => {
      const config = loadConfig();

      if (!config) {
        console.error(chalk.red('Configuration file not found. Run "helios init" first.'));
        process.exit(1);
      }

      console.warn(chalk.yellow(`Registry lookup not yet implemented. This is a placeholder for adding: ${component}`));
    });
}
