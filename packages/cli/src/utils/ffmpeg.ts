import { spawn } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';

export interface TranscodeOptions {
  videoCodec?: string;
  audioCodec?: string;
  quality?: string;
  preset?: string;
  ffmpegPath?: string;
}

/**
 * Concatenates input videos and transcodes them to the output format.
 * Uses FFmpeg concat demuxer but applies codec options instead of stream copy.
 */
export async function transcodeMerge(
  inputPaths: string[],
  outputPath: string,
  options: TranscodeOptions
): Promise<void> {
  if (inputPaths.length === 0) {
    throw new Error('No input files provided for merge');
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create file list content for ffmpeg concat demuxer
  const listContent = inputPaths.map(p => {
    const absolutePath = path.resolve(p).replace(/\\/g, '/');
    return `file '${absolutePath}'`;
  }).join('\n');

  const ffmpegPath = options.ffmpegPath || ffmpeg.path;

  // Base args
  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-protocol_whitelist', 'file,pipe',
    '-i', '-', // Read list from stdin
  ];

  // Video Codec
  if (options.videoCodec) {
    args.push('-c:v', options.videoCodec);
  } else {
    // Default to copy if not specified? No, if we are calling transcodeMerge, we likely want to encoding behavior.
    // But if options are missing, we should probably follow ffmpeg defaults (which re-encodes).
    // However, if the user explicitly called this, they likely provided options.
  }

  // Audio Codec
  if (options.audioCodec) {
    args.push('-c:a', options.audioCodec);
  }

  // Quality (CRF)
  if (options.quality) {
    args.push('-crf', options.quality);
  }

  // Preset
  if (options.preset) {
    args.push('-preset', options.preset);
  }

  // Output
  args.push('-y', outputPath);

  console.log(`Spawning FFmpeg for transcode merge: ${ffmpegPath} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args);
    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg merge failed with code ${code}: ${stderr}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });

    // Write file list to stdin
    process.stdin.write(listContent);
    process.stdin.end();
  });
}
