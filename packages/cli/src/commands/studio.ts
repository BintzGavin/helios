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
    .option('--mcp-public-url <origin>', 'HTTPS origin for the separate authenticated MCP listener')
    .option('--mcp-secret-service <name>', 'OS secret-store service (account: helios-mcp)')
    .option('--mcp-port <number>', 'Loopback port for the authenticated MCP listener', '5174')
    .action(async (options) => {
      try {
        if (Boolean(options.mcpPublicUrl) !== Boolean(options.mcpSecretService)) {
          throw new Error('Use --mcp-public-url and --mcp-secret-service together.');
        }
        console.log(chalk.blue('Starting Studio...'));

        const config = loadConfig(process.cwd());
        console.log(chalk.dim(`Fetching component registry${config?.framework ? ` (${config.framework})` : ''}...`));

        const client = new RegistryClient(config?.registry);
        const components = await client.getComponents(config?.framework);

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // The published CLI carries Studio's UI and server in dist/studio (scripts/embed-packages.js).
        // In the workspace, Studio comes from packages/studio.
        const embeddedStudio = path.resolve(__dirname, '../studio');
        let studioRoot: string;
        let studioDist: string;
        if (fs.existsSync(path.join(embeddedStudio, 'index.html'))) {
          studioRoot = embeddedStudio;
          studioDist = embeddedStudio;
        } else {
          const require = createRequire(import.meta.url);
          const studioCliPath = require.resolve('@helios-project/studio/cli');
          studioRoot = path.resolve(path.dirname(studioCliPath), '../../');
          studioDist = path.join(studioRoot, 'dist');
        }

        // Resolve bundled skills path relative to this CLI file
        const skillsRoot = path.resolve(__dirname, '../skills');

        console.log(`Studio Root: ${studioRoot}`);
        if (fs.existsSync(skillsRoot)) {
            console.log(`Skills Root: ${skillsRoot}`);
        }

        const server = await createServer({
          // configFile: false, // Removed to allow loading user config (crucial for framework plugins)
          root: process.cwd(),
          server: {
            host: '127.0.0.1',
            port: parseInt(options.port, 10),
            strictPort: false
          },
          plugins: [
            studioApiPlugin({
              projectRoot: process.cwd(),
              remoteMcp: options.mcpPublicUrl ? {
                publicUrl: options.mcpPublicUrl,
                secretService: options.mcpSecretService,
                port: Number(options.mcpPort),
              } : undefined,
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
                const componentsDir = config?.directories?.components || 'src/components/helios';
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
