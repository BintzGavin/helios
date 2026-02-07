import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { RenderOrchestrator, DistributedRenderOptions } from '@helios-project/renderer';
import { JobSpec, RenderJobChunk } from '../types/job.js';

export function registerRenderCommand(program: Command) {
  program
    .command('render <input>')
    .description('Render a composition to video')
    .option('-o, --output <path>', 'Output file path', 'output.mp4')
    .option('--width <number>', 'Viewport width', '1920')
    .option('--height <number>', 'Viewport height', '1080')
    .option('--fps <number>', 'Frames per second', '30')
    .option('--duration <number>', 'Duration in seconds', '1')
    .option('--quality <number>', 'CRF quality (0-51)')
    .option('--mode <mode>', 'Render mode (canvas or dom)', 'canvas')
    .option('--start-frame <number>', 'Frame to start rendering from')
    .option('--frame-count <number>', 'Number of frames to render')
    .option('--concurrency <number>', 'Number of concurrent render jobs', '1')
    .option('--no-headless', 'Run in visible browser window (default: headless)')
    .option('--emit-job <path>', 'Generate a distributed render job spec (JSON) instead of rendering')
    .option('--audio-codec <codec>', 'Audio codec (e.g., aac, pcm_s16le)')
    .option('--video-codec <codec>', 'Video codec (e.g., libx264, libvpx)')
    .action(async (input, options) => {
      try {
        const url = input.startsWith('http')
          ? input
          : pathToFileURL(path.resolve(process.cwd(), input)).href;
        const outputPath = path.resolve(process.cwd(), options.output);

        console.log(`Initializing renderer...`);
        console.log(`Input: ${url}`);
        console.log(`Output: ${outputPath}`);

        const startFrame = options.startFrame ? parseInt(options.startFrame, 10) : undefined;
        if (startFrame !== undefined && isNaN(startFrame)) {
          throw new Error('start-frame must be a valid number');
        }

        const frameCount = options.frameCount ? parseInt(options.frameCount, 10) : undefined;
        if (frameCount !== undefined && isNaN(frameCount)) {
          throw new Error('frame-count must be a valid number');
        }

        const concurrency = options.concurrency ? parseInt(options.concurrency, 10) : 1;
        if (isNaN(concurrency)) {
          throw new Error('concurrency must be a valid number');
        }

        if (options.emitJob) {
          const fps = parseInt(options.fps, 10);
          const duration = parseInt(options.duration, 10);
          const width = parseInt(options.width, 10);
          const height = parseInt(options.height, 10);

          let totalFrames = frameCount;
          if (totalFrames === undefined) {
            totalFrames = Math.ceil(duration * fps);
          }

          // Resolve job path and directory
          const jobPath = path.resolve(process.cwd(), options.emitJob);
          const jobDir = path.dirname(jobPath);

          const chunks: RenderJobChunk[] = [];
          const chunkSize = Math.ceil(totalFrames / concurrency);
          const outputDir = path.dirname(outputPath);

          // Calculate paths relative to the job file
          let relInput = input;
          if (!input.startsWith('http')) {
             const absInputPath = path.resolve(process.cwd(), input);
             relInput = path.relative(jobDir, absInputPath);
          }

          const relOutput = path.relative(jobDir, outputPath);
          const relOutputDir = path.relative(jobDir, outputDir);

          // Force intermediate chunks to be .mov for PCM support
          const chunkExt = '.mov';
          const outputExt = path.extname(outputPath); // Keep original for final output name calc if needed
          const outputName = path.basename(outputPath, outputExt);

          // Construct base command parts using RELATIVE input
          const baseArgs = ['helios', 'render', relInput];
          if (options.width) baseArgs.push('--width', options.width);
          if (options.height) baseArgs.push('--height', options.height);
          if (options.fps) baseArgs.push('--fps', options.fps);
          // duration is derived from chunk frame count, but passing original duration doesn't hurt if frame-count overrides it
          // actually, for clarity, we should omit duration if we pass frame-count
          if (options.quality) baseArgs.push('--quality', options.quality);
          if (options.mode) baseArgs.push('--mode', options.mode);
          if (options.headless === false) baseArgs.push('--no-headless');

          // Force robust intermediate codecs for chunks
          // RenderOrchestrator uses pcm_s16le for audio to avoid sync issues.
          baseArgs.push('--audio-codec', 'pcm_s16le');

          const mergeInputs = [];

          for (let i = 0; i < concurrency; i++) {
            const chunkStart = (startFrame || 0) + i * chunkSize;
            // Calculate remaining frames based on current chunk index, not absolute frame
            const framesProcessed = i * chunkSize;
            const chunkCount = Math.min(chunkSize, totalFrames - framesProcessed);

            if (chunkCount <= 0) break;

            const chunkFilename = `${outputName}_part_${i}${chunkExt}`;

            // chunkPath for COMMAND (relative to jobDir)
            const relChunkPath = path.join(relOutputDir, chunkFilename);

            mergeInputs.push(relChunkPath);

            const chunkArgs = [...baseArgs];
            chunkArgs.push('-o', relChunkPath);
            chunkArgs.push('--start-frame', chunkStart.toString());
            chunkArgs.push('--frame-count', chunkCount.toString());

            chunks.push({
              id: i,
              startFrame: chunkStart,
              frameCount: chunkCount,
              outputFile: relChunkPath, // Store relative path
              command: chunkArgs.join(' ')
            });
          }

          let mergeCommand = `helios merge ${relOutput} ${mergeInputs.join(' ')}`;

          // Pass final output options to merge command for transcoding
          if (options.videoCodec) mergeCommand += ` --video-codec ${options.videoCodec}`;
          if (options.audioCodec) mergeCommand += ` --audio-codec ${options.audioCodec}`;
          if (options.quality) mergeCommand += ` --quality ${options.quality}`;

          const jobSpec: JobSpec = {
            metadata: {
              totalFrames,
              fps,
              width,
              height,
              duration: totalFrames / fps
            },
            chunks,
            mergeCommand
          };

          fs.writeFileSync(jobPath, JSON.stringify(jobSpec, null, 2));
          console.log(`Job spec written to ${jobPath}`);
          return;
        }

        const renderOptions: DistributedRenderOptions = {
          width: parseInt(options.width, 10),
          height: parseInt(options.height, 10),
          fps: parseInt(options.fps, 10),
          durationInSeconds: parseInt(options.duration, 10),
          crf: options.quality ? parseInt(options.quality, 10) : undefined,
          mode: options.mode as 'canvas' | 'dom',
          startFrame,
          frameCount,
          concurrency,
          audioCodec: options.audioCodec,
          videoCodec: options.videoCodec,
          browserConfig: {
            headless: options.headless, // 'no-headless' sets this to false
          },
        };

        await RenderOrchestrator.render(url, outputPath, renderOptions);
        console.log('Render complete.');
      } catch (err: any) {
        console.error('Render failed:', err.message);
        process.exit(1);
      }
    });
}
