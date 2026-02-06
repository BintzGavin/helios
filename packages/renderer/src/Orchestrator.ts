import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { Renderer } from './Renderer.js';
import { RendererOptions, RenderJobOptions } from './types.js';
import { concatenateVideos } from './concat.js';
import { FFmpegBuilder } from './utils/FFmpegBuilder.js';

export interface DistributedRenderOptions extends RendererOptions {
  concurrency?: number;
}

// Define constants for robust audio pipeline
const CHUNK_AUDIO_CODEC = 'pcm_s16le';
const CHUNK_EXTENSION = '.mov';

export class RenderOrchestrator {
  static async render(compositionUrl: string, outputPath: string, options: DistributedRenderOptions, jobOptions?: RenderJobOptions): Promise<void> {
    const concurrency = options.concurrency || Math.max(1, os.cpus().length - 1);

    // Determine total frames
    let totalFrames = options.frameCount;
    if (!totalFrames) {
        totalFrames = Math.ceil(options.durationInSeconds * options.fps);
    }

    // If concurrency is 1, just use standard Renderer
    if (concurrency === 1) {
      const renderer = new Renderer(options);
      return renderer.render(compositionUrl, outputPath, jobOptions);
    }

    console.log(`Starting distributed render with concurrency: ${concurrency}`);

    const chunkSize = Math.ceil(totalFrames / concurrency);
    const tempFiles: string[] = [];
    const promises: Promise<void>[] = [];

    // Ensure output directory exists (Renderer usually does this, but we need it for temp files)
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // Pipeline Strategy:
    // 1. Render chunks with PCM audio (capturing implicit DOM audio) into .mov container
    // 2. Concatenate chunks into a master PCM .mov file
    // 3. Transcode/Mix to final output (adding explicit audio)

    // We always perform the final step to ensure consistent transcoding and mixing
    const finalStepNeeded = true;

    // The intermediate concatenation target is always a PCM .mov file
    const concatTarget = path.join(outputDir, `temp_concat_${Date.now()}${CHUNK_EXTENSION}`);

    // Chunk Options:
    // - Remove explicit audio tracks (they are mixed in the final step)
    // - Force PCM audio codec (to capture implicit audio without artifacts)
    // - Inherit video codec (or defaults from strategy)
    const chunkBaseOptions: RendererOptions = {
      ...options,
      audioTracks: [],
      audioFilePath: undefined,
      audioCodec: CHUNK_AUDIO_CODEC
    };

    const tempPrefix = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create an internal AbortController to manage worker cancellation
    const internalController = new AbortController();

    // Link user-provided signal (if any) to the internal controller
    const userSignalHandler = () => internalController.abort();
    if (jobOptions?.signal) {
      if (jobOptions.signal.aborted) {
        internalController.abort();
      } else {
        jobOptions.signal.addEventListener('abort', userSignalHandler);
      }
    }

    // Create job options for workers that use the internal signal
    const workerJobOptions: RenderJobOptions = {
      ...jobOptions,
      signal: internalController.signal,
    };

    for (let i = 0; i < concurrency; i++) {
      const start = i * chunkSize;
      // Ensure we don't exceed totalFrames
      const count = Math.min(chunkSize, totalFrames - start);

      if (count <= 0) break;

      // Use CHUNK_EXTENSION for temporary chunk files
      const tempFile = path.join(outputDir, `${tempPrefix}_part_${i}${CHUNK_EXTENSION}`);
      tempFiles.push(tempFile);

      // Create options for this chunk
      // We must preserve the original options but override startFrame and frameCount
      const chunkOptions: RendererOptions = {
        ...chunkBaseOptions,
        startFrame: (options.startFrame || 0) + start,
        frameCount: count,
        // Calculate duration based on frame count to be consistent, though Renderer prioritizes frameCount
        durationInSeconds: count / options.fps
      };

      const renderer = new Renderer(chunkOptions);

      console.log(`[Worker ${i}] Rendering frames ${chunkOptions.startFrame} to ${chunkOptions.startFrame! + count} (${count} frames) to ${tempFile}`);

      // Wrap the promise to abort other workers on failure
      const promise = renderer.render(compositionUrl, tempFile, workerJobOptions)
        .catch(err => {
          // If one worker fails, abort the others immediately
          if (!internalController.signal.aborted) {
            console.warn(`[Worker ${i}] failed. Aborting other workers...`);
            internalController.abort();
          }
          throw err;
        });

      promises.push(promise);
    }

    try {
      await Promise.all(promises);
      console.log('All chunks rendered. Concatenating...');
      await concatenateVideos(tempFiles, concatTarget, { ffmpegPath: options.ffmpegPath });

      if (finalStepNeeded) {
        console.log('Mixing audio into concatenated video...');

        // Use FFmpegBuilder to generate args for the mixing pass
        // We force 'copy' for video to avoid re-encoding
        // We enable mixInputAudio to preserve the audio from the concatenated chunks (implicit audio)
        const mixOptions: RendererOptions = { ...options, videoCodec: 'copy', mixInputAudio: true };
        const videoInputArgs = ['-i', concatTarget];

        // FFmpegBuilder handles audio offsets/seeking based on options
        const { args } = FFmpegBuilder.getArgs(mixOptions, outputPath, videoInputArgs);

        const ffmpegPath = options.ffmpegPath || ffmpeg.path;
        console.log(`Spawning FFmpeg for audio mixing: ${ffmpegPath} ${args.join(' ')}`);

        await new Promise<void>((resolve, reject) => {
          const process = spawn(ffmpegPath, args);
          let stderr = '';

          process.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          process.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`FFmpeg audio mix failed with code ${code}: ${stderr}`));
            }
          });

          process.on('error', (err) => {
            reject(err);
          });
        });

        // Cleanup intermediate silent video
        try {
          if (fs.existsSync(concatTarget)) {
            await fs.promises.unlink(concatTarget);
          }
        } catch (e) {
          console.warn(`Failed to delete temp concat file ${concatTarget}`, e);
        }
      }

    } finally {
      // Clean up event listener
      if (jobOptions?.signal) {
        jobOptions.signal.removeEventListener('abort', userSignalHandler);
      }

      console.log('Cleaning up temporary files...');
      for (const file of tempFiles) {
        try {
          if (fs.existsSync(file)) {
            await fs.promises.unlink(file);
          }
        } catch (e) {
          console.warn(`Failed to delete temp file ${file}`, e);
        }
      }
    }
  }
}
