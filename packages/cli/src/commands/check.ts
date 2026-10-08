import { Command } from 'commander';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { checkVideo, formatCheckReport, type CheckReport } from '../utils/video-check.js';

export function registerCheckCommand(program: Command) {
  program
    .command('check <video>')
    .description('Check a rendered video: its streams, color tags, length, and flashing (WCAG 2.3.1)')
    .option('--json', 'Print exactly one JSON object instead of the report')
    .action(async (video: string, options: { json?: boolean }) => {
      let report: CheckReport;
      try {
        report = await checkVideo(video, ffmpeg.path);
      } catch (err: any) {
        console.error(`Check failed: ${err.message}`);
        process.exit(1);
        return;
      }
      if (options.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        console.log(formatCheckReport(report));
      }
      process.exit(report.ok ? 0 : 1);
    });
}
