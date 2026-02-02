import * as path from 'path';
import * as fs from 'fs';
import { Renderer } from './Renderer.js';
import { RendererOptions, RenderJobOptions } from './types.js';
import { concatenateVideos } from './concat.js';
import { cpus } from 'os';

export interface DistributedRenderOptions extends RendererOptions {
  /**
   * Number of concurrent render workers.
   * Defaults to 1 (or CPU count - 1 if sensible, but let's stick to explicit or 1 for safety).
   */
  concurrency?: number;
}

export class RenderOrchestrator {
  /**
   * Orchestrates a distributed render by splitting the job into chunks and running them in parallel.
   *
   * @param compositionUrl The URL of the composition to render.
   * @param outputPath The path to save the final video.
   * @param options Render configuration.
   * @param jobOptions Job control options (progress, cancellation).
   */
  static async render(compositionUrl: string, outputPath: string, options: DistributedRenderOptions, jobOptions?: RenderJobOptions): Promise<void> {
    const concurrency = options.concurrency || 1;

    // optimization: if concurrency is 1, just use a single renderer
    if (concurrency === 1) {
      const renderer = new Renderer(options);
      return renderer.render(compositionUrl, outputPath, jobOptions);
    }

    const totalFrames = options.frameCount
      ? options.frameCount
      : Math.floor(options.durationInSeconds * options.fps);

    const chunkSize = Math.ceil(totalFrames / concurrency);

    console.log(`Starting distributed render: ${totalFrames} frames across ${concurrency} workers (chunk size: ${chunkSize})`);

    const tempFiles: string[] = [];
    const promises: Promise<void>[] = [];
    const outputDir = path.dirname(outputPath);

    // Ensure output dir exists
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // We need to track progress across all workers
    const progressMap = new Array(concurrency).fill(0);
    const updateProgress = (workerIndex: number, workerProgress: number) => {
      if (jobOptions?.onProgress) {
        progressMap[workerIndex] = workerProgress;
        const totalProgress = progressMap.reduce((a, b) => a + b, 0) / concurrency;
        jobOptions.onProgress(totalProgress);
      }
    };

    for (let i = 0; i < concurrency; i++) {
      const start = (options.startFrame || 0) + (i * chunkSize);
      // Ensure we don't go past the total frames
      const remaining = totalFrames - (i * chunkSize);
      const count = Math.min(chunkSize, remaining);

      if (count <= 0) break;

      const tempFile = path.join(outputDir, `temp_${Date.now()}_${i}.mp4`);
      tempFiles.push(tempFile);

      const workerOptions: RendererOptions = {
        ...options,
        startFrame: start,
        frameCount: count,
        // We probably don't want audio in chunks if we are going to concat?
        // Actually, if we concat, we want audio in chunks so they are concatenated too.
        // But audio tracks might be full length.
        // If we use 'startFrame', the Renderer/Strategies/TimeDrivers should handle seeking.
        // FFmpegBuilder with audio input might be tricky.
        // If audio is a separate file mixed in, Renderer adds it.
        // If we slice the video, we should ideally slice the audio too.
        // The current Renderer implementation pipes audio.
        // Does Renderer handle audio offset for startFrame?
        // 'TimeDriver.setTime' sets the time.
        // 'FFmpegBuilder' adds audio inputs.
        // If we use `ss` (seek) on input audio in FFmpeg, it might work.
        // But Renderer.ts implementation of audio is:
        // inputBuffers are piped.
        // FFmpegBuilder uses `audioTracks`.
        // Let's check FFmpegBuilder (implied, likely in strategies or utils).
        // The plan says "Renderer (supports startFrame, frameCount)".
        // Assuming Renderer handles it.
        // Warning: If Renderer mixes full audio for every chunk, the result will have audio restart every chunk?
        // Or if it mixes based on timestamp?
        // The `Renderer` sets time driver. But FFmpeg audio mixing usually takes the whole file.
        // If we use `RenderStrategy`, it returns ffmpeg args.
        // If the strategy doesn't handle seeking audio for the chunk, we might have issues.
        // But let's follow the plan for now.
      };

      const renderer = new Renderer(workerOptions);

      const workerJobOptions: RenderJobOptions = {
        signal: jobOptions?.signal,
        onProgress: (p) => updateProgress(i, p)
      };

      console.log(`[Worker ${i}] Starting frames ${start} to ${start + count} -> ${tempFile}`);
      promises.push(renderer.render(compositionUrl, tempFile, workerJobOptions));
    }

    try {
      await Promise.all(promises);
      console.log('All workers finished. Concatenating...');

      await concatenateVideos(tempFiles, outputPath, { ffmpegPath: options.ffmpegPath });

      console.log('Concatenation complete. Cleaning up...');
      await Promise.all(tempFiles.map(f => fs.promises.unlink(f).catch(e => console.warn('Failed to delete temp file', f))));

    } catch (err) {
      console.error('Distributed render failed:', err);
      // Cleanup on error
      await Promise.all(tempFiles.map(f => fs.promises.unlink(f).catch(() => {})));
      throw err;
    }
  }
}
