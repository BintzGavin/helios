import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../utils/config.js';
import { findComponent } from '../registry/manifest.js';

export function registerAddCommand(program: Command) {
  program
    .command('add <component>')
    .description('Add a component to your project')
    .action(async (componentName) => {
      const config = loadConfig();

      if (!config) {
        console.error(chalk.red('Configuration file not found. Run "helios init" first.'));
        process.exit(1);
      }

      const component = findComponent(componentName);
      if (!component) {
        console.error(chalk.red(`Component "${componentName}" not found in registry.`));
        process.exit(1);
      }

      const targetBaseDir = path.resolve(process.cwd(), config.directories.components);

      // Ensure base directory exists
      if (!fs.existsSync(targetBaseDir)) {
        fs.mkdirSync(targetBaseDir, { recursive: true });
      }

      console.log(chalk.cyan(`Installing ${component.name}...`));

      for (const file of component.files) {
        const filePath = path.join(targetBaseDir, file.name);
        const fileDir = path.dirname(filePath);

        // Ensure subdirectories exist
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        if (fs.existsSync(filePath)) {
          console.warn(chalk.yellow(`File already exists: ${file.name}. Skipping.`));
          continue;
        }

        fs.writeFileSync(filePath, file.content);
        console.log(chalk.green(`✓ Created ${file.name}`));
      }

      if (component.dependencies) {
        console.log('\n' + chalk.yellow('Required dependencies:'));
        for (const [dep, version] of Object.entries(component.dependencies)) {
          console.log(`  - ${dep}@${version}`);
        }
      }
    });
}
