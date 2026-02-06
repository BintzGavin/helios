import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { concatenateVideos } from '@helios-project/renderer';
import { transcodeMerge } from '../utils/ffmpeg.js';

export function registerMergeCommand(program: Command) {
  program
    .command('merge <output> [inputs...]')
    .description('Merge multiple video files into one (supports transcoding)')
    .option('--video-codec <codec>', 'Video codec (e.g., libx264)')
    .option('--audio-codec <codec>', 'Audio codec (e.g., aac)')
    .option('--quality <number>', 'CRF quality (0-51)')
    .option('--preset <preset>', 'Encoder preset (e.g., fast, slow)')
    .action(async (output, inputs, options) => {
      try {
        if (!inputs || inputs.length === 0) {
          throw new Error('No input files provided.');
        }

        const outputPath = path.resolve(process.cwd(), output);
        const inputPaths = inputs.map((input: string) => path.resolve(process.cwd(), input));

        console.log(chalk.cyan(`Merging ${inputPaths.length} files into ${outputPath}...`));

        if (options.videoCodec || options.audioCodec || options.quality || options.preset) {
          console.log(chalk.yellow('Transcoding enabled. This may take a while...'));
          await transcodeMerge(inputPaths, outputPath, {
            videoCodec: options.videoCodec,
            audioCodec: options.audioCodec,
            quality: options.quality,
            preset: options.preset
          });
        } else {
          await concatenateVideos(inputPaths, outputPath);
        }

        console.log(chalk.green('Merge complete.'));
      } catch (err: any) {
        console.error(chalk.red(`Merge failed: ${err.message}`));
        process.exit(1);
      }
    });
}
