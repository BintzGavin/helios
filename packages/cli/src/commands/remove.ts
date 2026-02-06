import { Command } from 'commander';
import chalk from 'chalk';
import { uninstallComponent } from '../utils/uninstall.js';

export function registerRemoveCommand(program: Command) {
  program
    .command('remove <component>')
    .description('Remove a component from your project configuration')
    .action(async (component) => {
      try {
        await uninstallComponent(process.cwd(), component);
      } catch (error) {
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
