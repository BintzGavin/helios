import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { Renderer } from './Renderer.js';
import { RendererOptions, RenderJobOptions, RenderPlan, RenderChunk } from './types.js';
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
  static plan(compositionUrl: string, outputPath: string, options: DistributedRenderOptions): RenderPlan {
    const concurrency = options.concurrency || Math.max(1, os.cpus().length - 1);
    let totalFrames = options.frameCount;
    if (!totalFrames) {
      totalFrames = Math.ceil(options.durationInSeconds * options.fps);
    }

    const outputDir = path.dirname(outputPath);
    const tempPrefix = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const concatTarget = path.join(outputDir, `temp_concat_${Date.now()}${CHUNK_EXTENSION}`);

    // Chunk Base Options
    // - Remove explicit audio tracks (they are mixed in the final step)
    // - Force PCM audio codec (to capture implicit audio without artifacts)
    const chunkBaseOptions: RendererOptions = {
      ...options,
      audioTracks: [],
      audioFilePath: undefined,
      audioCodec: CHUNK_AUDIO_CODEC
    };

    const chunks: RenderChunk[] = [];
    const chunkSize = Math.ceil(totalFrames / concurrency);
    const tempFiles: string[] = [];

    for (let i = 0; i < concurrency; i++) {
      const start = i * chunkSize;
      const count = Math.min(chunkSize, totalFrames - start);
      if (count <= 0) break;

      const tempFile = path.join(outputDir, `${tempPrefix}_part_${i}${CHUNK_EXTENSION}`);
      tempFiles.push(tempFile);

      const chunkOptions: RendererOptions = {
        ...chunkBaseOptions,
        startFrame: (options.startFrame || 0) + start,
        frameCount: count,
        durationInSeconds: count / options.fps
      };

      chunks.push({
        id: i,
        startFrame: chunkOptions.startFrame!,
        frameCount: count,
        outputFile: tempFile,
        options: chunkOptions
      });
    }

    const mixOptions: RendererOptions = {
      ...options,
      videoCodec: 'copy',
      mixInputAudio: true, // Optimistically enable mix input audio, executor should verify
      subtitles: undefined
    };

    const cleanupFiles = [...tempFiles, concatTarget];

    return {
      totalFrames,
      chunks,
      concatManifest: tempFiles,
      concatOutputFile: concatTarget,
      finalOutputFile: outputPath,
      mixOptions,
      cleanupFiles
    };
  }

  static async render(compositionUrl: string, outputPath: string, options: DistributedRenderOptions, jobOptions?: RenderJobOptions): Promise<void> {
    const executor = options.executor || new LocalExecutor();
    const concurrency = options.concurrency || Math.max(1, os.cpus().length - 1);

    // If concurrency is 1, just use standard Renderer directly (no planning needed)
    if (concurrency === 1) {
      return executor.render(compositionUrl, outputPath, options, jobOptions);
    }

    console.log(`Starting distributed render with concurrency: ${concurrency}`);

    // Create the plan
    const plan = this.plan(compositionUrl, outputPath, options);

    // Ensure output directory exists (Renderer usually does this, but we need it for temp files)
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

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

    const promises: Promise<void>[] = [];
    const workerProgress = new Array(plan.chunks.length).fill(0);
    const workerWeights = new Array(plan.chunks.length).fill(0);

    for (let i = 0; i < plan.chunks.length; i++) {
      const chunk = plan.chunks[i];

      // Calculate weight for this worker
      workerWeights[i] = chunk.frameCount / plan.totalFrames;

      // Create job options for this worker with progress aggregation
      const workerJobOptions: RenderJobOptions = {
        ...jobOptions,
        signal: internalController.signal,
        onProgress: (p: number) => {
          workerProgress[i] = p;

          // Calculate global progress
          let globalProgress = 0;
          for (let j = 0; j < plan.chunks.length; j++) {
            globalProgress += workerProgress[j] * workerWeights[j];
          }

          if (jobOptions?.onProgress) {
            jobOptions.onProgress(globalProgress);
          }
        }
      };

      console.log(`[Worker ${i}] Rendering frames ${chunk.startFrame} to ${chunk.startFrame + chunk.frameCount} (${chunk.frameCount} frames) to ${chunk.outputFile}`);

      // Wrap the promise to abort other workers on failure
      const promise = executor.render(compositionUrl, chunk.outputFile, chunk.options, workerJobOptions)
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
      await concatenateVideos(plan.concatManifest, plan.concatOutputFile, { ffmpegPath: options.ffmpegPath });

      // Final mix step
      console.log('Mixing audio into concatenated video...');

      const ffmpegPath = options.ffmpegPath || ffmpeg.path;

      // Detect if the concatenated video has an audio stream (implicit audio)
      // This is a runtime check that overrides the plan's optimistic mixInputAudio
      const hasImplicitAudio = await hasAudioStream(plan.concatOutputFile, ffmpegPath);
      if (!hasImplicitAudio) {
        console.log('No implicit audio stream detected in concatenated video.');
      }

      // Use the plan's mix options but update mixInputAudio based on actual content
      const mixOptions: RendererOptions = {
        ...plan.mixOptions,
        mixInputAudio: hasImplicitAudio && plan.mixOptions.mixInputAudio !== false
      };

      const videoInputArgs = ['-i', plan.concatOutputFile];

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

    } finally {
      // Clean up event listener
      if (jobOptions?.signal) {
        jobOptions.signal.removeEventListener('abort', userSignalHandler);
      }

      console.log('Cleaning up temporary files...');

      for (const file of plan.cleanupFiles) {
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
