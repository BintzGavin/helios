import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../utils/config.js';

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Initialize a new Helios project configuration')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .action(async (options) => {
      const configPath = path.resolve(process.cwd(), 'helios.config.json');

      if (fs.existsSync(configPath)) {
        console.error(chalk.red('Configuration file already exists.'));
        process.exit(1);
      }

      // Deep copy to avoid mutating the exported constant
      let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

      if (!options.yes) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const ask = (question: string, defaultValue: string): Promise<string> => {
          return new Promise((resolve) => {
            rl.question(`${question} ${chalk.gray(`(${defaultValue})`)}: `, (answer) => {
              resolve(answer.trim() || defaultValue);
            });
          });
        };

        console.log(chalk.cyan('Initializing Helios configuration...'));

        const componentsDir = await ask(
          'Where would you like to install components?',
          DEFAULT_CONFIG.directories.components
        );
        const libDir = await ask(
          'Where is your lib directory?',
          DEFAULT_CONFIG.directories.lib
        );

        config.directories.components = componentsDir;
        config.directories.lib = libDir;

        rl.close();
      }

      try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(chalk.green('Initialized helios.config.json'));
      } catch (error) {
        console.error(chalk.red('Failed to write configuration file:'), error);
        process.exit(1);
      }
    });
}
