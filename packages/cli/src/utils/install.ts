import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from './config.js';
import { findComponent } from '../registry/manifest.js';

export async function installComponent(rootDir: string, componentName: string) {
  const config = loadConfig(rootDir);

  if (!config) {
    throw new Error('Configuration file not found. Run "helios init" first.');
  }

  const component = findComponent(componentName);
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
}
