import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { DEFAULT_CONFIG } from '../utils/config.js';
import { REACT_TEMPLATE } from '../templates/react.js';
import { VUE_TEMPLATE } from '../templates/vue.js';
import { SVELTE_TEMPLATE } from '../templates/svelte.js';
import { SOLID_TEMPLATE } from '../templates/solid.js';
import { VANILLA_TEMPLATE } from '../templates/vanilla.js';
import { fetchExamples, downloadExample, transformProject } from '../utils/examples.js';

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
    .command('init [target]')
    .description('Initialize a new Helios project configuration')
    .option('-y, --yes', 'Skip prompts and use defaults (React)')
    .option('-f, --framework <framework>', 'Specify framework (react, vue, svelte, solid, vanilla)')
    .option('--example <name>', 'Initialize from an example')
    .option('--repo <repo>', 'Example repository (user/repo or user/repo/path)', 'BintzGavin/helios/examples')
    .action(async (target, options) => {
      const targetDir = target ? path.resolve(process.cwd(), target) : process.cwd();
      const configPath = path.resolve(targetDir, 'helios.config.json');
      const packageJsonPath = path.resolve(targetDir, 'package.json');
      let isScaffolded = false;
      let selectedFramework: Framework = 'react';
      let mode = 'template'; // 'template' | 'example'

      // Create target directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Check if directory is empty
      const isDirEmpty = (dir: string) => fs.readdirSync(dir).length === 0;
      if (fs.existsSync(targetDir) && !isDirEmpty(targetDir)) {
          if (!options.yes) {
            const response = await prompts({
              type: 'confirm',
              name: 'continue',
              message: `Target directory is not empty. Continue?`,
              initial: false
            });
            if (!response.continue) process.exit(1);
          }
      }

      // 1. Check for Example Usage via Flag
      if (options.example) {
        mode = 'example';
        console.log(chalk.cyan(`Downloading example '${options.example}' from '${options.repo}'...`));
        try {
          await downloadExample(options.example, targetDir, options.repo);
          console.log(chalk.green('Downloaded example. Transforming files...'));
          transformProject(targetDir);
          console.log(chalk.green('Project initialized from example.'));
          isScaffolded = true;
        } catch (error) {
          console.error(chalk.red(`Failed to download example '${options.example}':`), error);
          process.exit(1);
        }
      }
      // 2. Normal Scaffolding Flow (Interactive)
      else if (!fs.existsSync(packageJsonPath)) {
        let shouldScaffold = options.yes;

        if (!options.yes) {
          const response = await prompts({
            type: 'select',
            name: 'mode',
            message: 'How do you want to start?',
            choices: [
              { title: 'Scaffold a new project (from template)', value: 'template' },
              { title: 'Download an example', value: 'example' },
            ],
            initial: 0
          });

          if (!response.mode) process.exit(0);
          mode = response.mode;
          shouldScaffold = true;
        }

        if (mode === 'example') {
            console.log(chalk.gray(`Fetching examples from ${options.repo}...`));
            const examples = await fetchExamples(options.repo);

            if (examples.length === 0) {
              console.log(chalk.yellow('No examples found or failed to fetch. Falling back to templates.'));
              mode = 'template';
            } else {
              const response = await prompts({
                type: 'autocomplete',
                name: 'example',
                message: 'Select an example:',
                choices: examples.map(ex => ({ title: ex, value: ex })),
              });

              if (!response.example) process.exit(0);

              console.log(chalk.cyan(`Downloading example '${response.example}'...`));
              try {
                await downloadExample(response.example, targetDir, options.repo);
                transformProject(targetDir);
                isScaffolded = true;
              } catch (error) {
                console.error(chalk.red('Failed to download example:'), error);
                process.exit(1);
              }
            }
        }

        if (mode === 'template' && shouldScaffold && !isScaffolded) {
          if (options.framework) {
             const normalized = options.framework.toLowerCase();
             if (['react', 'vue', 'svelte', 'solid', 'vanilla'].includes(normalized)) {
                selectedFramework = normalized as Framework;
             }
          } else if (!options.yes) {
             const response = await prompts({
               type: 'select',
               name: 'framework',
               message: 'Select framework',
               choices: [
                 { title: 'React', value: 'react' },
                 { title: 'Vue', value: 'vue' },
                 { title: 'Svelte', value: 'svelte' },
                 { title: 'Solid', value: 'solid' },
                 { title: 'Vanilla', value: 'vanilla' },
               ]
             });
             if (!response.framework) process.exit(0);
             selectedFramework = response.framework as Framework;
          }

          console.log(chalk.cyan(`Scaffolding new Helios project (${selectedFramework})...`));
          try {
            const template = TEMPLATES[selectedFramework];
            for (const [filepath, content] of Object.entries(template)) {
              const fullPath = path.resolve(targetDir, filepath);
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

      // Config generation
      if (fs.existsSync(configPath)) {
        if (!isScaffolded && !options.yes) {
             console.error(chalk.red('Configuration file already exists.'));
             process.exit(1);
        }
      } else {
          // Deep copy default
          let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

          if (isScaffolded) {
             if (mode === 'template') {
                config.framework = selectedFramework;
             } else if (mode === 'example') {
                // Try to detect framework from package.json
                try {
                  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                  if (deps.vue) config.framework = 'vue';
                  else if (deps.svelte) config.framework = 'svelte';
                  else if (deps['solid-js']) config.framework = 'solid';
                  else if (deps.react) config.framework = 'react';
                } catch (e) {
                  // ignore
                }
             }
          }

          if (!options.yes && !isScaffolded) {
             const response = await prompts([
                {
                    type: 'select',
                    name: 'framework',
                    message: 'Which framework are you using?',
                    choices: [
                        { title: 'React', value: 'react' },
                        { title: 'Vue', value: 'vue' },
                        { title: 'Svelte', value: 'svelte' },
                        { title: 'Solid', value: 'solid' },
                        { title: 'Vanilla', value: 'vanilla' },
                    ],
                    initial: 0
                },
                {
                    type: 'text',
                    name: 'components',
                    message: 'Where would you like to install components?',
                    initial: DEFAULT_CONFIG.directories.components
                },
                {
                    type: 'text',
                    name: 'lib',
                    message: 'Where is your lib directory?',
                    initial: DEFAULT_CONFIG.directories.lib
                }
             ]);

             if (!response.framework) process.exit(0);

             config.framework = response.framework;
             config.directories.components = response.components;
             config.directories.lib = response.lib;
          } else if (options.framework) {
             config.framework = options.framework.toLowerCase();
          }

          try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(chalk.green('Initialized helios.config.json'));
          } catch (error) {
             console.error(chalk.red('Failed to write configuration file:'), error);
             process.exit(1);
          }
      }

      if (isScaffolded) {
        console.log(chalk.blue('\nProject ready! Run the following commands to get started:\n'));
        if (target) {
            console.log(chalk.cyan(`  cd ${target}`));
        }
        console.log(chalk.cyan('  npm install'));
        console.log(chalk.cyan('  npm run dev'));
        console.log('');
      }
    });
}
