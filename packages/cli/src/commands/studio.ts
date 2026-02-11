import { Command } from 'commander';
import { createServer } from 'vite';
import { studioApiPlugin } from '@helios-project/studio/cli';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RegistryClient } from '../registry/client.js';
import { installComponent } from '../utils/install.js';
import { uninstallComponent } from '../utils/uninstall.js';
import { loadConfig } from '../utils/config.js';
import chalk from 'chalk';

export function registerStudioCommand(program: Command) {
  program
    .command('studio')
    .description('Launch the Helios Studio')
    .option('-p, --port <number>', 'Port to listen on', '5173')
    .action(async (options) => {
      try {
        console.log(chalk.blue('Starting Studio...'));

        const config = loadConfig(process.cwd());
        console.log(chalk.dim(`Fetching component registry${config?.framework ? ` (${config.framework})` : ''}...`));

        const client = new RegistryClient(config?.registry);
        const components = await client.getComponents(config?.framework);

        const require = createRequire(import.meta.url);

        // Resolve the path to the studio package
        // We resolve the CLI entry point and go up to find the package root
        const studioCliPath = require.resolve('@helios-project/studio/cli');
        const studioRoot = path.resolve(path.dirname(studioCliPath), '../../');
        const studioDist = path.join(studioRoot, 'dist');

        // Resolve bundled skills path relative to this CLI file
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const skillsRoot = path.resolve(__dirname, '../skills');

        console.log(`Studio Root: ${studioRoot}`);
        if (fs.existsSync(skillsRoot)) {
            console.log(`Skills Root: ${skillsRoot}`);
        }

        const server = await createServer({
          // configFile: false, // Removed to allow loading user config (crucial for framework plugins)
          root: process.cwd(),
          server: {
            port: parseInt(options.port, 10),
            strictPort: false
          },
          plugins: [
            studioApiPlugin({
              studioRoot: studioDist,
              skillsRoot: skillsRoot,
              components: components,
              onInstallComponent: async (name: string) => {
                await installComponent(process.cwd(), name, { install: true, client });
              },
              onRemoveComponent: async (name: string) => {
                await uninstallComponent(process.cwd(), name, { removeFiles: true, client });
              },
              onUpdateComponent: async (name: string) => {
                await installComponent(process.cwd(), name, { install: true, overwrite: true, client });
              },
              onCheckInstalled: async (name: string) => {
                const config = loadConfig(process.cwd());
                const componentsDir = config?.directories.components || 'src/components/helios';
                const comp = components.find(c => c.name === name);
                if (!comp) return false;

                const targetDir = path.resolve(process.cwd(), componentsDir);
                return comp.files.every(f => fs.existsSync(path.join(targetDir, f.name)));
              }
            })
          ]
        });

        await server.listen();
        server.printUrls();
      } catch (e: any) {
        console.error('Failed to start Studio:', e);
        process.exit(1);
      }
    });
}
