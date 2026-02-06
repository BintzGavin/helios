import { Command } from 'commander';
import { build } from 'vite';
import chalk from 'chalk';

export function registerBuildCommand(program: Command) {
  program
    .command('build')
    .description('Build the project for production')
    .option('-o, --out-dir <dir>', 'Output directory', 'dist')
    .action(async (options) => {
      try {
        console.log(chalk.cyan('Starting production build...'));

        await build({
          root: process.cwd(),
          build: {
            outDir: options.outDir,
            emptyOutDir: true,
          }
        });

        console.log(chalk.green(`Build complete. Output: ${options.outDir}`));
      } catch (error) {
        console.error(chalk.red('Build failed:'), error);
        process.exit(1);
      }
    });
}
