import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { pathToFileURL, fileURLToPath, URL } from 'url';
import { RenderOrchestrator, DistributedRenderOptions, RendererOptions } from '@helios-project/renderer';
import { JobSpec, RenderJobChunk } from '../types/job.js';

function rendererOptionsToFlags(options: RendererOptions): string {
  const flags: string[] = [];
  if (options.width) flags.push(`--width ${options.width}`);
  if (options.height) flags.push(`--height ${options.height}`);
  if (options.fps) flags.push(`--fps ${options.fps}`);
  if (options.crf !== undefined) flags.push(`--quality ${options.crf}`);
  if (options.mode) flags.push(`--mode ${options.mode}`);
  if (options.audioCodec) flags.push(`--audio-codec ${options.audioCodec}`);
  if (options.videoCodec) flags.push(`--video-codec ${options.videoCodec}`);
  if (options.browserConfig?.headless === false) flags.push('--no-headless');
  return flags.join(' ');
}

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
    .option('--base-url <url>', 'Base URL for remote asset resolution (alias for --job-base-url)')
    .option('--job-base-url <url>', 'Base URL for remote asset resolution (for distributed jobs)')
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

        // Parse browser args from environment variable
        const browserArgs = process.env.HELIOS_BROWSER_ARGS
          ? process.env.HELIOS_BROWSER_ARGS.split(' ')
          : undefined;

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

        if (browserArgs) {
          console.log(`Using custom browser arguments: ${browserArgs.join(' ')}`);
        }

        if (executablePath) {
          console.log(`Using custom browser executable: ${executablePath}`);
        }

        if (options.emitJob) {
          const fps = parseInt(options.fps, 10);
          const duration = parseInt(options.duration, 10);
          const width = parseInt(options.width, 10);
          const height = parseInt(options.height, 10);
          const crf = options.quality ? parseInt(options.quality, 10) : undefined;

          const renderOptions: DistributedRenderOptions = {
            width,
            height,
            fps,
            durationInSeconds: duration,
            crf,
            mode: options.mode as 'canvas' | 'dom',
            startFrame,
            frameCount,
            concurrency,
            audioCodec: options.audioCodec,
            videoCodec: options.videoCodec,
            browserConfig: {
              headless: options.headless,
              args: browserArgs,
              executablePath,
            },
          };

          const plan = RenderOrchestrator.plan(url, outputPath, renderOptions);

          const jobPath = path.resolve(process.cwd(), options.emitJob);
          const jobDir = path.dirname(jobPath);

          // Calculate relative paths for portability
          let relativeInput = url;
          if (url.startsWith('file://')) {
            const inputPath = fileURLToPath(url);
            relativeInput = path.relative(jobDir, inputPath);
          }

          const relativeOutputPath = path.relative(jobDir, outputPath);

          const chunks: RenderJobChunk[] = plan.chunks.map(chunk => {
            const flags = rendererOptionsToFlags(chunk.options);
            const relativeChunkOutput = path.relative(jobDir, chunk.outputFile);

            let commandInput = relativeInput;
            const jobBaseUrl = options.baseUrl || options.jobBaseUrl;

            if (jobBaseUrl && !relativeInput.startsWith('http')) {
              // If we have a base URL, we want to resolve the input file relative to the project root
              // (process.cwd()) and append it to the base URL.
              // This allows workers to fetch assets from a remote server using the same folder structure.
              let projectRelativeInput = relativeInput;

              if (url.startsWith('file://')) {
                 const inputPath = fileURLToPath(url);
                 projectRelativeInput = path.relative(process.cwd(), inputPath);
              }

              // Normalize separators for URL compatibility
              const normalizedPath = projectRelativeInput.split(path.sep).join('/');

              // Ensure base URL ends with slash
              const baseUrl = jobBaseUrl.endsWith('/')
                ? jobBaseUrl
                : `${jobBaseUrl}/`;

              // Remove leading ./ if present to avoid http://site/./path
              const cleanPath = normalizedPath.startsWith('./')
                ? normalizedPath.slice(2)
                : normalizedPath;

              commandInput = new URL(cleanPath, baseUrl).href;
            }

            return {
              id: chunk.id,
              startFrame: chunk.startFrame,
              frameCount: chunk.frameCount,
              outputFile: relativeChunkOutput,
              // Use relative paths for portability
              command: `helios render ${commandInput} -o ${relativeChunkOutput} --start-frame ${chunk.startFrame} --frame-count ${chunk.frameCount} ${flags}`
            };
          });

          // Convert manifest paths to relative
          const relativeManifest = plan.concatManifest.map(f => path.relative(jobDir, f));

          let mergeCommand = `helios merge ${relativeOutputPath} ${relativeManifest.join(' ')}`;

          if (plan.mixOptions.videoCodec && plan.mixOptions.videoCodec !== 'copy') {
            mergeCommand += ` --video-codec ${plan.mixOptions.videoCodec}`;
          }
          if (plan.mixOptions.audioCodec) {
            mergeCommand += ` --audio-codec ${plan.mixOptions.audioCodec}`;
          }
          if (plan.mixOptions.crf !== undefined) {
            mergeCommand += ` --quality ${plan.mixOptions.crf}`;
          }

          const jobSpec: JobSpec = {
            metadata: {
              totalFrames: plan.totalFrames,
              fps,
              width,
              height,
              duration: plan.totalFrames / fps
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
            args: browserArgs,
            executablePath,
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
