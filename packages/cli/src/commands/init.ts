import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../utils/config.js';
import { REACT_TEMPLATE } from '../templates/react.js';
import { VUE_TEMPLATE } from '../templates/vue.js';
import { SVELTE_TEMPLATE } from '../templates/svelte.js';
import { SOLID_TEMPLATE } from '../templates/solid.js';
import { VANILLA_TEMPLATE } from '../templates/vanilla.js';

type Framework = 'react' | 'vue' | 'svelte' | 'solid' | 'vanilla';

const TEMPLATES: Record<Framework, Record<string, string>> = {
  react: REACT_TEMPLATE,
  vue: VUE_TEMPLATE,
  svelte: SVELTE_TEMPLATE,
  solid: SOLID_TEMPLATE,
  vanilla: VANILLA_TEMPLATE
};

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Initialize a new Helios project configuration')
    .option('-y, --yes', 'Skip prompts and use defaults (React)')
    .option('-f, --framework <framework>', 'Specify framework (react, vue, svelte, solid, vanilla)')
    .action(async (options) => {
      const configPath = path.resolve(process.cwd(), 'helios.config.json');
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      let isScaffolded = false;
      let selectedFramework: Framework = 'react';

      if (options.framework) {
        const normalized = options.framework.toLowerCase();
        if (['react', 'vue', 'svelte', 'solid', 'vanilla'].includes(normalized)) {
          selectedFramework = normalized as Framework;
        } else {
          console.error(chalk.red(`Invalid framework: ${options.framework}`));
          process.exit(1);
        }
      }

      const ask = (question: string, defaultValue?: string): Promise<string> => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        return new Promise((resolve) => {
          const suffix = defaultValue ? ` ${chalk.gray(`[${defaultValue}]`)}` : '';
          rl.question(`${question}${suffix}: `, (answer) => {
            rl.close();
            resolve(answer.trim() || defaultValue || '');
          });
        });
      };

      if (!fs.existsSync(packageJsonPath)) {
        let shouldScaffold = options.yes; // Default to yes if -y is passed

        if (!options.yes) {
          const answer = await ask(`No package.json found. Do you want to scaffold a new project? ${chalk.gray('(Y/n)')}`, 'y');
          const normalized = answer.toLowerCase();
          shouldScaffold = normalized === 'y' || normalized === 'yes';
        }

        if (shouldScaffold) {
          if (!options.yes && !options.framework) {
            const frameworkInput = await ask(`Select framework (${chalk.cyan('react')}, vue, svelte, solid, vanilla)`, 'react');
            const normalized = frameworkInput.toLowerCase();
            if (['react', 'vue', 'svelte', 'solid', 'vanilla'].includes(normalized)) {
              selectedFramework = normalized as Framework;
            }
          }

          console.log(chalk.cyan(`Scaffolding new Helios project (${selectedFramework})...`));
          try {
            const template = TEMPLATES[selectedFramework];
            for (const [filepath, content] of Object.entries(template)) {
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

      if (isScaffolded) {
        config.framework = selectedFramework;
      }

      // Skip prompts if we just scaffolded (use defaults matching template) OR if -y passed
      if (!options.yes && !isScaffolded) {
        console.log(chalk.cyan('Initializing Helios configuration...'));

        if (options.framework) {
          config.framework = options.framework.toLowerCase();
        } else {
          const framework = await ask(
            'Which framework are you using? (react, vue, svelte, solid, vanilla)',
            'react'
          );
          if (['react', 'vue', 'svelte', 'solid', 'vanilla'].includes(framework.toLowerCase())) {
            config.framework = framework.toLowerCase();
          }
        }

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
