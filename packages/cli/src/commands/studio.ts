import { Command } from 'commander';
import { createServer } from 'vite';
import { studioApiPlugin } from '@helios-project/studio/cli';
import { createRequire } from 'module';
import path from 'path';
import { registry } from '../registry/manifest.js';
import { installComponent } from '../utils/install.js';

export function registerStudioCommand(program: Command) {
  program
    .command('studio')
    .description('Launch the Helios Studio')
    .option('-p, --port <number>', 'Port to listen on', '5173')
    .action(async (options) => {
      console.log('Starting Studio...');

      try {
        const require = createRequire(import.meta.url);

        // Resolve the path to the studio package
        // We resolve the CLI entry point and go up to find the package root
        const studioCliPath = require.resolve('@helios-project/studio/cli');
        const studioRoot = path.resolve(path.dirname(studioCliPath), '../../');
        const studioDist = path.join(studioRoot, 'dist');

        console.log(`Studio Root: ${studioRoot}`);

        const server = await createServer({
          configFile: false, // Ensure we don't pick up a random vite.config.js unless intended?
                             // Actually user might want their own config for aliases etc.
                             // But for Studio we act as the host.
                             // Usually we want to respect user's vite config if they have one for their project?
                             // But the plan said "The CLI will act as the 'Server Host'".
                             // If we pass `root: process.cwd()`, Vite will look for config there.
                             // This is probably good so user can configure aliases.
          root: process.cwd(),
          server: {
            port: parseInt(options.port, 10),
            strictPort: false
          },
          plugins: [
            studioApiPlugin({
              studioRoot: studioDist,
              components: registry,
              onInstallComponent: async (name) => {
                await installComponent(process.cwd(), name);
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
