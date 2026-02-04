import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { concatenateVideos } from '@helios-project/renderer';

export function registerMergeCommand(program: Command) {
  program
    .command('merge <output> [inputs...]')
    .description('Merge multiple video files into one without re-encoding')
    .action(async (output, inputs) => {
      try {
        if (!inputs || inputs.length === 0) {
          throw new Error('No input files provided.');
        }

        const outputPath = path.resolve(process.cwd(), output);
        const inputPaths = inputs.map((input: string) => path.resolve(process.cwd(), input));

        console.log(chalk.cyan(`Merging ${inputPaths.length} files into ${outputPath}...`));

        await concatenateVideos(inputPaths, outputPath);

        console.log(chalk.green('Merge complete.'));
      } catch (err: any) {
        console.error(chalk.red(`Merge failed: ${err.message}`));
        process.exit(1);
      }
    });
}
