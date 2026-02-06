import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import { loadConfig } from '../utils/config.js';
import { installComponent } from '../utils/install.js';

export function registerUpdateCommand(program: Command) {
  program
    .command('update <component>')
    .description('Update a component to the latest version')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('--no-install', 'Skip dependency installation')
    .action(async (component, options) => {
      const config = loadConfig();

      if (!config) {
        console.error(chalk.red('Configuration file not found. Run "helios init" first.'));
        process.exit(1);
      }

      if (!config.components || !config.components.includes(component)) {
        console.error(chalk.red(`Component "${component}" is not installed.`));
        console.log(chalk.gray(`Run "helios add ${component}" to install it.`));
        process.exit(1);
      }

      if (!options.yes) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(
            `This will overwrite changes in '${component}'. Continue? (y/N) `,
            (ans) => {
              rl.close();
              resolve(ans);
            }
          );
        });

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log(chalk.gray('Aborted.'));
          return;
        }
      }

      try {
        await installComponent(process.cwd(), component, {
          install: options.install,
          overwrite: true,
        });
        console.log(chalk.green(`\nSuccessfully updated ${component}!`));
      } catch (error) {
        console.error(chalk.red(`Failed to update component: ${error instanceof Error ? error.message : error}`));
        process.exit(1);
      }
    });
}
