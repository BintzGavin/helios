import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig, saveConfig } from './config.js';
import { defaultClient } from '../registry/client.js';
import { installPackage } from './package-manager.js';
import { ComponentDefinition } from '../registry/types.js';

async function resolveComponentTree(
  componentName: string,
  framework: string | undefined,
  visited: Set<string> = new Set()
): Promise<ComponentDefinition[]> {
  if (visited.has(componentName)) {
    return [];
  }

  visited.add(componentName);

  const component = await defaultClient.findComponent(componentName, framework);
  if (!component) {
    throw new Error(`Component "${componentName}" not found in registry.`);
  }

  const components: ComponentDefinition[] = [];

  // Recursively resolve registry dependencies first
  if (component.registryDependencies) {
    for (const depName of component.registryDependencies) {
      const depComponents = await resolveComponentTree(depName, framework, visited);
      components.push(...depComponents);
    }
  }

  components.push(component);
  return components;
}

export async function installComponent(
  rootDir: string,
  componentName: string,
  options: { install: boolean; overwrite?: boolean } = { install: true }
) {
  const config = loadConfig(rootDir);

  if (!config) {
    throw new Error('Configuration file not found. Run "helios init" first.');
  }

  const componentsToInstall = await resolveComponentTree(componentName, config.framework);

  const targetBaseDir = path.resolve(rootDir, config.directories.components);

  // Ensure base directory exists
  if (!fs.existsSync(targetBaseDir)) {
    fs.mkdirSync(targetBaseDir, { recursive: true });
  }

  const uniqueNpmDeps = new Map<string, string>();
  const installedComponents: string[] = [];

  for (const component of componentsToInstall) {
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
      for (const [dep, version] of Object.entries(component.dependencies)) {
        // Simple version resolution: last one wins for now
        uniqueNpmDeps.set(dep, version);
      }
    }

    installedComponents.push(component.name);
  }

  // Handle NPM dependencies
  if (uniqueNpmDeps.size > 0) {
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
    for (const [dep, version] of uniqueNpmDeps.entries()) {
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

  let configChanged = false;
  for (const installedName of installedComponents) {
    if (!config.components.includes(installedName)) {
      config.components.push(installedName);
      configChanged = true;
    }
  }

  if (configChanged) {
    saveConfig(config, rootDir);
    console.log(chalk.green(`✓ Updated helios.config.json`));
  }
}
