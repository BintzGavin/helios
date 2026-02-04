import { Command } from 'commander';
import chalk from 'chalk';
import { installComponent } from '../utils/install.js';

export function registerAddCommand(program: Command) {
  program
    .command('add <component>')
    .description('Add a component to your project')
    .action(async (componentName) => {
      try {
        await installComponent(process.cwd(), componentName);
      } catch (e: any) {
        console.error(chalk.red(e.message));
        process.exit(1);
      }
    });
}
