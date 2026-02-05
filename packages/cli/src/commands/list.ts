import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../utils/config.js';

export function registerListCommand(program: Command) {
  program
    .command('list')
    .description('List installed components')
    .action(() => {
      try {
        const config = loadConfig();

        if (!config) {
          console.error(chalk.red('No helios.config.json found. Run "helios init" to start a project.'));
          process.exit(1);
        }

        if (!config.components || config.components.length === 0) {
          console.log(chalk.yellow('No components installed yet. Use "helios add [component]" to install one.'));
          return;
        }

        console.log(chalk.bold('Installed components:'));
        for (const component of config.components) {
          console.log(` - ${chalk.cyan(component)}`);
        }
      } catch (error: any) {
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });
}
