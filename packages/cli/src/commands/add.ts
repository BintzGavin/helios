import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../utils/config.js';
import { RegistryClient } from '../registry/client.js';
import { installComponent } from '../utils/install.js';

export function registerAddCommand(program: Command) {
  program
    .command('add <component>')
    .description('Add a component to your project')
    .option('--no-install', 'Skip dependency installation')
    .action(async (componentName, options) => {
      try {
        const config = loadConfig(process.cwd());
        const client = new RegistryClient(config?.registry);
        await installComponent(process.cwd(), componentName, { install: options.install, client });
      } catch (e: any) {
        console.error(chalk.red(e.message));
        process.exit(1);
      }
    });
}
