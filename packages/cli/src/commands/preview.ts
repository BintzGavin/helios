import { Command } from 'commander';
import { preview } from 'vite';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

export function registerPreviewCommand(program: Command) {
  program
    .command('preview [dir]')
    .description('Preview the production build locally')
    .option('-o, --out-dir <dir>', 'Output directory', 'dist')
    .option('-p, --port <number>', 'Port to listen on', '4173')
    .action(async (dir = '.', options) => {
      const rootDir = path.resolve(process.cwd(), dir);
      const outDir = path.resolve(rootDir, options.outDir);

      if (!fs.existsSync(outDir)) {
        console.error(chalk.red(`Error: Build directory not found at ${outDir}`));
        console.error(chalk.yellow(`Run 'helios build' first.`));
        process.exit(1);
      }

      try {
        const port = parseInt(options.port, 10);
        const server = await preview({
          root: rootDir,
          build: { outDir: options.outDir },
          preview: { port }
        });

        server.printUrls();
        // Keep process alive
      } catch (e) {
        console.error(chalk.red('Failed to start preview server:'), e);
        process.exit(1);
      }
    });
}
