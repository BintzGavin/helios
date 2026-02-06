import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { Renderer } from './Renderer.js';
import { RendererOptions, RenderJobOptions } from './types.js';
import { concatenateVideos } from './concat.js';
import { FFmpegBuilder } from './utils/FFmpegBuilder.js';
import { RenderExecutor } from './executors/RenderExecutor.js';
import { LocalExecutor } from './executors/LocalExecutor.js';

export interface DistributedRenderOptions extends RendererOptions {
  concurrency?: number;
  executor?: RenderExecutor;
}

// Define constants for robust audio pipeline
const CHUNK_AUDIO_CODEC = 'pcm_s16le';
const CHUNK_EXTENSION = '.mov';

// Helper to detect if a video file has an audio stream
function hasAudioStream(filePath: string, ffmpegPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn(ffmpegPath, ['-i', filePath]);
    let stderr = '';
    process.stderr.on('data', (d) => stderr += d.toString());
    process.on('close', () => {
      // Look for "Audio:" stream in the output
      resolve(/Stream #.*:.*Audio:/.test(stderr));
    });
    process.on('error', () => resolve(false));
  });
}

export class RenderOrchestrator {
  static async render(compositionUrl: string, outputPath: string, options: DistributedRenderOptions, jobOptions?: RenderJobOptions): Promise<void> {
    const concurrency = options.concurrency || Math.max(1, os.cpus().length - 1);

    // Determine total frames
    let totalFrames = options.frameCount;
    if (!totalFrames) {
        totalFrames = Math.ceil(options.durationInSeconds * options.fps);
    }

    const executor = options.executor || new LocalExecutor();

    // If concurrency is 1, just use standard Renderer
    if (concurrency === 1) {
      return executor.render(compositionUrl, outputPath, options, jobOptions);
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

    // Progress tracking
    const workerProgress = new Array(concurrency).fill(0);
    const workerWeights = new Array(concurrency).fill(0);

    for (let i = 0; i < concurrency; i++) {
      const start = i * chunkSize;
      // Ensure we don't exceed totalFrames
      const count = Math.min(chunkSize, totalFrames - start);

      if (count <= 0) break;

      // Calculate weight for this worker
      workerWeights[i] = count / totalFrames;

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

      // Create job options for this worker with progress aggregation
      const workerJobOptions: RenderJobOptions = {
        ...jobOptions,
        signal: internalController.signal,
        onProgress: (p: number) => {
          workerProgress[i] = p;

          // Calculate global progress
          let globalProgress = 0;
          for (let j = 0; j < concurrency; j++) {
            globalProgress += workerProgress[j] * workerWeights[j];
          }

          if (jobOptions?.onProgress) {
            jobOptions.onProgress(globalProgress);
          }
        }
      };

      console.log(`[Worker ${i}] Rendering frames ${chunkOptions.startFrame} to ${chunkOptions.startFrame! + count} (${count} frames) to ${tempFile}`);

      // Wrap the promise to abort other workers on failure
      const promise = executor.render(compositionUrl, tempFile, chunkOptions, workerJobOptions)
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

        const ffmpegPath = options.ffmpegPath || ffmpeg.path;

        // Detect if the concatenated video has an audio stream (implicit audio)
        const hasImplicitAudio = await hasAudioStream(concatTarget, ffmpegPath);
        if (!hasImplicitAudio) {
          console.log('No implicit audio stream detected in concatenated video.');
        }

        // Use FFmpegBuilder to generate args for the mixing pass
        // We force 'copy' for video to avoid re-encoding
        // We enable mixInputAudio to preserve the audio from the concatenated chunks (implicit audio)
        // We explicitly disable subtitles because they are already burned into the chunks (if requested)
        // and enabling them here with 'copy' codec would cause FFmpegBuilder to throw an error.
        const mixOptions: RendererOptions = {
          ...options,
          videoCodec: 'copy',
          mixInputAudio: hasImplicitAudio,
          subtitles: undefined
        };
        const videoInputArgs = ['-i', concatTarget];

        // FFmpegBuilder handles audio offsets/seeking based on options
        const { args } = FFmpegBuilder.getArgs(mixOptions, outputPath, videoInputArgs);

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
      }

    } finally {
      // Clean up event listener
      if (jobOptions?.signal) {
        jobOptions.signal.removeEventListener('abort', userSignalHandler);
      }

      console.log('Cleaning up temporary files...');

      // Ensure the concatenated intermediate file is also cleaned up
      if (concatTarget) {
        tempFiles.push(concatTarget);
      }

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
