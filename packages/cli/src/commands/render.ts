import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, URL } from 'url';
import { RenderOrchestrator, DistributedRenderOptions, RendererOptions, probeComposition } from '@helios-project/renderer';
import type { CompositionInfo } from '@helios-project/renderer';
import { JobSpec, RenderJobChunk } from '../types/job.js';
import { DEFAULT_FPS, DEFAULT_HEIGHT, DEFAULT_WIDTH, isUrl, parsePositive, withCompositionUrl } from '../utils/render-options.js';

function parseMode(value: string): 'canvas' | 'dom' {
  if (value !== 'canvas' && value !== 'dom') {
    throw new Error(`--mode must be "dom" or "canvas" (got "${value}")`);
  }
  return value;
}

function describeDriver(info: CompositionInfo): string {
  switch (info.driver) {
    case 'helios': return 'its window.helios declares no duration';
    case 'hook': return `it draws frames with window.${info.hook}(t) but declares no duration`;
    case 'gsap': return 'it drives a GSAP timeline but declares no duration';
    default: return 'it defines no window.helios or window.renderAt(t)';
  }
}

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
    .option('--width <number>', `Viewport width (default: the composition's, else ${DEFAULT_WIDTH})`)
    .option('--height <number>', `Viewport height (default: the composition's, else ${DEFAULT_HEIGHT})`)
    .option('--fps <number>', `Frames per second (default: the composition's, else ${DEFAULT_FPS})`)
    .option('--duration <seconds>', "Duration in seconds (default: the composition's)")
    .option('--quality <number>', 'CRF quality (0-51)')
    .option('--mode <mode>', 'dom: screenshot the page, works for any page; canvas: capture the first <canvas>, faster', 'dom')
    .option('--audio <file>', 'Audio file to use as the soundtrack')
    .option('--gpu', 'Enable GPU acceleration in the browser (WebGL)')
    .option('--no-gpu', 'Disable GPU acceleration in the browser')
    .option('--start-frame <number>', 'Frame to start rendering from')
    .option('--frame-count <number>', 'Number of frames to render')
    .option('--concurrency <number>', 'Number of concurrent render jobs', '1')
    .option('--no-headless', 'Run in visible browser window (default: headless)')
    .option('--emit-job <path>', 'Generate a distributed render job spec (JSON) instead of rendering')
    .option('--base-url <url>', 'Base URL for remote asset resolution (alias for --job-base-url)')
    .option('--job-base-url <url>', 'Base URL for remote asset resolution (for distributed jobs)')
    .option('--audio-codec <codec>', 'Audio codec (e.g., aac, pcm_s16le)')
    .option('--video-codec <codec>', 'Video codec (e.g., libx264, libvpx)')
    .option('--no-serve', 'Load a local page from file:// instead of serving it over http')
    .action(async (input, options) => {
      try {
        // Local pages are served over http so they can fetch() files next to them. A job
        // spec only plans the render, so it keeps the file path.
        await withCompositionUrl(input, options.serve !== false && !options.emitJob, async (url) => {
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

          /* istanbul ignore next */
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

          const mode = parseMode(options.mode);
          const fpsFlag = parsePositive(options.fps, '--fps');
          const durationFlag = parsePositive(options.duration, '--duration');
          const widthFlag = parsePositive(options.width, '--width', true);
          const heightFlag = parsePositive(options.height, '--height', true);
          const crf = options.quality ? parseInt(options.quality, 10) : undefined;

          let audioFilePath: string | undefined;
          if (options.audio) {
            if (options.emitJob) {
              // `helios merge` cannot mux a soundtrack yet, so the job would silently lose it.
              throw new Error('--audio is not supported with --emit-job yet; add the soundtrack to the merged video instead');
            }
            audioFilePath = path.resolve(process.cwd(), options.audio);
            if (!fs.existsSync(audioFilePath)) {
              throw new Error(`Audio file not found: ${options.audio}`);
            }
          }

          const browserConfig = {
            headless: options.headless, // 'no-headless' sets this to false
            args: browserArgs,
            executablePath,
            ...(options.gpu !== undefined ? { gpu: options.gpu as boolean } : {}),
          };

          // Whatever the flags leave open comes from the composition itself.
          let info: CompositionInfo | undefined;
          const needsDuration = durationFlag === undefined && frameCount === undefined;
          if (fpsFlag === undefined || needsDuration || widthFlag === undefined || heightFlag === undefined) {
            info = await probeComposition(url, {
              browserConfig,
              width: widthFlag ?? DEFAULT_WIDTH,
              height: heightFlag ?? DEFAULT_HEIGHT,
            });
            const declared = [
              info.durationInSeconds !== undefined ? `${info.durationInSeconds}s` : null,
              info.fps !== undefined ? `${info.fps} fps` : null,
              info.width !== undefined && info.height !== undefined ? `${info.width}x${info.height}` : null,
            ].filter(Boolean);
            if (declared.length) console.log(`Composition declares ${declared.join(', ')}`);
          }
          const fps = fpsFlag ?? info?.fps ?? DEFAULT_FPS;
          const width = widthFlag ?? info?.width ?? DEFAULT_WIDTH;
          const height = heightFlag ?? info?.height ?? DEFAULT_HEIGHT;
          const declaredDuration = durationFlag ?? info?.durationInSeconds;
          if (declaredDuration === undefined && frameCount === undefined) {
            throw new Error(`How long should the video be? Pass --duration <seconds>: ${describeDriver(info!)}.`);
          }
          const durationInSeconds = declaredDuration ?? frameCount! / fps;
          console.log(`Rendering ${durationInSeconds}s at ${fps} fps, ${width}x${height}, ${mode} mode`);

          if (options.emitJob) {
            const renderOptions: DistributedRenderOptions = {
              width,
              height,
              fps,
              durationInSeconds,
              crf,
              mode,
              startFrame,
              frameCount,
              concurrency,
              audioFilePath,
              audioCodec: options.audioCodec,
              videoCodec: options.videoCodec,
              browserConfig,
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

              if (jobBaseUrl && !isUrl(relativeInput)) {
                // If we have a base URL, we want to resolve the input file relative to the project root
                // (process.cwd()) and append it to the base URL.
                // This allows workers to fetch assets from a remote server using the same folder structure.
                let projectRelativeInput = relativeInput;

                /* istanbul ignore next */
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
            width,
            height,
            fps,
            durationInSeconds,
            crf,
            mode,
            startFrame,
            frameCount,
            concurrency,
            audioFilePath,
            audioCodec: options.audioCodec,
            videoCodec: options.videoCodec,
            browserConfig,
          };

          await RenderOrchestrator.render(url, outputPath, renderOptions);
          console.log('Render complete.');
        });
      } catch (err: any) {
        console.error('Render failed:', err.message);
        process.exit(1);
      }
    });
}
