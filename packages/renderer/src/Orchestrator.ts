import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Renderer } from './Renderer.js';
import { RendererOptions, RenderJobOptions } from './types.js';
import { concatenateVideos } from './concat.js';

export interface DistributedRenderOptions extends RendererOptions {
  concurrency?: number;
}

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

    const tempPrefix = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    for (let i = 0; i < concurrency; i++) {
      const start = i * chunkSize;
      // Ensure we don't exceed totalFrames
      const count = Math.min(chunkSize, totalFrames - start);

      if (count <= 0) break;

      const tempFile = path.join(outputDir, `${tempPrefix}_part_${i}.mp4`);
      tempFiles.push(tempFile);

      // Create options for this chunk
      // We must preserve the original options but override startFrame and frameCount
      const chunkOptions: RendererOptions = {
        ...options,
        startFrame: (options.startFrame || 0) + start,
        frameCount: count,
        // Calculate duration based on frame count to be consistent, though Renderer prioritizes frameCount
        durationInSeconds: count / options.fps
      };

      const renderer = new Renderer(chunkOptions);

      console.log(`[Worker ${i}] Rendering frames ${chunkOptions.startFrame} to ${chunkOptions.startFrame! + count} (${count} frames) to ${tempFile}`);

      promises.push(renderer.render(compositionUrl, tempFile, jobOptions));
    }

    try {
      await Promise.all(promises);
      console.log('All chunks rendered. Concatenating...');
      await concatenateVideos(tempFiles, outputPath, { ffmpegPath: options.ffmpegPath });
    } finally {
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
