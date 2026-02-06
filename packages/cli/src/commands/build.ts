import { Command } from 'commander';
import { build } from 'vite';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

export function registerBuildCommand(program: Command) {
  program
    .command('build [dir]')
    .description('Build the project for production')
    .option('-o, --out-dir <dir>', 'Output directory', 'dist')
    .action(async (dir = '.', options) => {
      const rootDir = path.resolve(process.cwd(), dir);
      const outDir = options.outDir;
      const entryPath = path.join(rootDir, '.helios-build-entry.html');
      const compositionPath = path.join(rootDir, 'composition.html');

      if (!fs.existsSync(compositionPath)) {
        console.error(chalk.red(`Error: composition.html not found in ${rootDir}`));
        process.exit(1);
      }

      // Create temporary entry file
      const entryContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Helios Player</title>
  <style>
    body { margin: 0; overflow: hidden; background: #000; height: 100vh; width: 100vw; }
    helios-player { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <helios-player src="./composition.html" auto-play controls></helios-player>
  <script type="module">import '@helios-project/player'</script>
</body>
</html>`;

      try {
        console.log(chalk.cyan('Starting production build...'));

        fs.writeFileSync(entryPath, entryContent);

        await build({
          root: rootDir,
          build: {
            outDir: outDir,
            emptyOutDir: true,
            rollupOptions: {
              input: {
                main: entryPath,
                composition: compositionPath
              }
            }
          }
        });

        // Rename output file
        const distDir = path.resolve(rootDir, outDir);
        const builtEntryPath = path.join(distDir, '.helios-build-entry.html');
        const finalIndexPath = path.join(distDir, 'index.html');

        if (fs.existsSync(builtEntryPath)) {
            fs.renameSync(builtEntryPath, finalIndexPath);
        }

        console.log(chalk.green(`Build complete. Output: ${path.join(dir, outDir)}`));
      } catch (error) {
        console.error(chalk.red('Build failed:'), error);
        process.exitCode = 1;
      } finally {
        // Cleanup
        if (fs.existsSync(entryPath)) {
            fs.unlinkSync(entryPath);
        }
      }
    });
}
