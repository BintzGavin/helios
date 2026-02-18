import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../utils/config.js';
import { RegistryClient } from '../registry/client.js';

export function registerComponentsCommand(program: Command) {
  program
    .command('components [query]')
    .description('List and search available components')
    .option('-f, --framework <name>', 'Filter by framework (react, vue, svelte, solid, vanilla)')
    .option('-a, --all', 'Show all components (ignore project framework)')
    .action(async (query: string | undefined, options: { framework?: string, all?: boolean }) => {
      const config = loadConfig(process.cwd());

      // Determine framework filter
      // 1. Default to config.framework
      // 2. If --all, set to undefined
      // 3. If --framework, override
      let frameworkFilter = config?.framework;
      if (options.all) frameworkFilter = undefined;
      if (options.framework) frameworkFilter = options.framework as any;

      const client = new RegistryClient(config?.registry);
      const components = await client.getComponents(frameworkFilter);

      // Filter by query (name or description)
      const filtered = query ? components.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(query.toLowerCase()))
      ) : components;

      if (filtered.length === 0) {
        if (query) {
          console.log(chalk.yellow(`No components found matching "${query}".`));
        } else {
          console.log(chalk.yellow('No components found in registry.'));
        }
        return;
      }

      console.log(chalk.bold('Available components:'));
      for (const component of filtered) {
        console.log(` - ${chalk.cyan(component.name)} ${chalk.gray(`(${component.type})`)}`);
        if (component.description) {
          console.log(`   ${chalk.gray(component.description)}`);
        }
      }
    });
}
