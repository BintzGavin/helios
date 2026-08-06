import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

export interface ConcatOptions {
  /**
   * Path to the FFmpeg binary.
   * Defaults to the binary provided by @ffmpeg-installer/ffmpeg.
   */
  ffmpegPath?: string;
}

/**
 * Concatenates multiple video files into a single video file using FFmpeg's concat demuxer.
 * This performs a stream copy (no re-encoding), so all inputs must have the same codecs and streams.
 *
 * @param inputPaths Array of paths to input video files
 * @param outputPath Path to the output video file
 * @param options Configuration options
 */
export async function concatenateVideos(inputPaths: string[], outputPath: string, options?: ConcatOptions): Promise<void> {
  if (inputPaths.length === 0) {
    throw new Error('No input files provided for concatenation');
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    await fs.promises.mkdir(outputDir, { recursive: true });
  }

  // Create file list content for ffmpeg concat demuxer
  // FFmpeg requires paths to be escaped properly.
  // We use absolute paths and replace backslashes with forward slashes for cross-platform compatibility.
  const listContent = inputPaths.map(p => {
    const absolutePath = path.resolve(p).replace(/\\/g, '/');
    const escapedPath = absolutePath.replace(/'/g, "'\\''");
    return `file '${escapedPath}'`;
  }).join('\n');

  // A concat manifest read from stdin has a `pipe:` base URL, which causes
  // FFmpeg to reinterpret even absolute file paths as pipe resources. Give
  // the manifest a real file URL base instead.
  const manifestDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'helios-concat-'));
  const manifestPath = path.join(manifestDir, 'inputs.txt');
  await fs.promises.writeFile(manifestPath, listContent, 'utf8');

  const ffmpegPath = options?.ffmpegPath || ffmpeg.path;
  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-protocol_whitelist', 'file,pipe',
    '-i', manifestPath,
    '-c', 'copy',
    '-y', // Overwrite output file
    outputPath
  ];

  console.log(`Spawning FFmpeg for concat: ${ffmpegPath} ${args.join(' ')}`);

  try {
    await new Promise<void>((resolve, reject) => {
      const process = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg concat failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  } finally {
    await fs.promises.rm(manifestDir, { recursive: true, force: true });
  }
}
