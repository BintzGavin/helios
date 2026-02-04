import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../utils/config.js';
import { BASIC_TEMPLATE } from '../templates/basic.js';

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Initialize a new Helios project configuration')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .action(async (options) => {
      const configPath = path.resolve(process.cwd(), 'helios.config.json');
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      let isScaffolded = false;

      if (!fs.existsSync(packageJsonPath)) {
        let shouldScaffold = options.yes; // Default to yes if -y is passed

        if (!options.yes) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question(`No package.json found. Do you want to scaffold a new project? ${chalk.gray('(Y/n)')}: `, (ans) => {
              resolve(ans);
            });
          });

          rl.close();
          const normalized = answer.trim().toLowerCase();
          shouldScaffold = normalized === '' || normalized === 'y' || normalized === 'yes';
        }

        if (shouldScaffold) {
          console.log(chalk.cyan('Scaffolding new Helios project...'));
          try {
            for (const [filepath, content] of Object.entries(BASIC_TEMPLATE)) {
              const fullPath = path.resolve(process.cwd(), filepath);
              const dir = path.dirname(fullPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(fullPath, content);
              console.log(chalk.green(`Created ${filepath}`));
            }
            isScaffolded = true;
            console.log(chalk.green('Project structure created.'));
          } catch (error) {
            console.error(chalk.red('Failed to scaffold project:'), error);
            process.exit(1);
          }
        }
      }

      if (fs.existsSync(configPath)) {
        console.error(chalk.red('Configuration file already exists.'));
        process.exit(1);
      }

      // Deep copy to avoid mutating the exported constant
      let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

      // Skip prompts if we just scaffolded (use defaults matching template) OR if -y passed
      if (!options.yes && !isScaffolded) {
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

        if (isScaffolded) {
          console.log(chalk.blue('\nProject ready! Run the following commands to get started:\n'));
          console.log(chalk.cyan('  npm install'));
          console.log(chalk.cyan('  npm run dev'));
          console.log('');
        }
      } catch (error) {
        console.error(chalk.red('Failed to write configuration file:'), error);
        process.exit(1);
      }
    });
}
