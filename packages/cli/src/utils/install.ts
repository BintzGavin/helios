import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig, saveConfig } from './config.js';
import { defaultClient } from '../registry/client.js';
import { installPackage } from './package-manager.js';

export async function installComponent(
  rootDir: string,
  componentName: string,
  options: { install: boolean; overwrite?: boolean } = { install: true }
) {
  const config = loadConfig(rootDir);

  if (!config) {
    throw new Error('Configuration file not found. Run "helios init" first.');
  }

  const component = await defaultClient.findComponent(componentName, config.framework);
  if (!component) {
    throw new Error(`Component "${componentName}" not found in registry.`);
  }

  const targetBaseDir = path.resolve(rootDir, config.directories.components);

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

    if (fs.existsSync(filePath) && !options.overwrite) {
      console.warn(chalk.yellow(`File already exists: ${file.name}. Skipping.`));
      continue;
    }

    fs.writeFileSync(filePath, file.content);
    console.log(chalk.green(`✓ ${options.overwrite && fs.existsSync(filePath) ? 'Updated' : 'Created'} ${file.name}`));
  }

  if (component.dependencies) {
    const depsToInstall: string[] = [];
    let packageJson: any = {};

    try {
      const packageJsonPath = path.resolve(rootDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      }
    } catch (e) {
      // Ignore error reading package.json
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    console.log('\n' + chalk.yellow('Required dependencies:'));
    for (const [dep, version] of Object.entries(component.dependencies)) {
      console.log(`  - ${dep}@${version}`);

      if (!allDeps[dep]) {
        depsToInstall.push(`${dep}@${version}`);
      }
    }

    if (options.install && depsToInstall.length > 0) {
      console.log(chalk.cyan(`\nInstalling dependencies...`));
      try {
        await installPackage(rootDir, depsToInstall);
        console.log(chalk.green(`✓ Dependencies installed`));
      } catch (e) {
        console.error(chalk.red(`Failed to install dependencies: ${e instanceof Error ? e.message : e}`));
      }
    } else if (depsToInstall.length > 0) {
      console.log(chalk.gray(`\nSkipping installation (--no-install)`));
    }
  }

  // Update config
  if (!config.components) {
    config.components = [];
  }

  if (!config.components.includes(componentName)) {
    config.components.push(componentName);
    saveConfig(config, rootDir);
    console.log(chalk.green(`✓ Added ${componentName} to helios.config.json`));
  }
}
