import { Renderer, RenderOrchestrator, DistributedRenderOptions, RendererOptions } from '@helios-project/renderer';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { getProjectRoot } from './discovery';

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  compositionId: string; // The URL/Path
  outputPath?: string;
  outputUrl?: string;
  error?: string;
  createdAt: number;
  inPoint?: number;
  outPoint?: number;
}

export interface RenderJobChunk {
  id: number;
  startFrame: number;
  frameCount: number;
  outputFile: string;
  command: string;
}

export interface RenderJobMetadata {
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  duration: number;
}

export interface JobSpec {
  metadata: RenderJobMetadata;
  chunks: RenderJobChunk[];
  mergeCommand: string;
}

const jobs = new Map<string, RenderJob>();
const jobControllers = new Map<string, AbortController>();

const JOBS_FILE = 'jobs.json';

function getJobsFilePath() {
  const projectRoot = getProjectRoot(process.cwd());
  return path.resolve(projectRoot, 'renders', JOBS_FILE);
}

let savePromise: Promise<void> | null = null;
let nextSavePromise: Promise<void> | null = null;

async function performSave(): Promise<void> {
  const file = getJobsFilePath();
  const rendersDir = path.dirname(file);
  try {
    await fs.promises.mkdir(rendersDir, { recursive: true });
    const jobList = Array.from(jobs.values());
    await fs.promises.writeFile(file, JSON.stringify(jobList, null, 2));
  } catch (e: any) {
    console.error('[RenderManager] Failed to save jobs history:', e);
  }
}

async function saveJobs(): Promise<void> {
  if (savePromise) {
    if (!nextSavePromise) {
      nextSavePromise = savePromise.then(() => {
        nextSavePromise = null;
        return saveJobs();
      });
    }
    return nextSavePromise;
  }

  const promise = performSave().finally(() => {
    if (savePromise === promise) {
      savePromise = null;
    }
  });
  savePromise = promise;
  return promise;
}

function loadJobs() {
  const file = getJobsFilePath();
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(data)) {
        let changed = false;
        for (const job of data) {
           // Handle interrupted jobs
           if (job.status === 'rendering' || job.status === 'queued') {
              job.status = 'failed';
              job.error = 'Server restarted during render';
              changed = true;
           }
           jobs.set(job.id, job);
        }
        if (changed) {
          saveJobs().catch((e: any) => console.error('[RenderManager] Failed to save cleaned jobs:', e));
        }
      }
    } catch (e: any) {
      console.warn('[RenderManager] Failed to load jobs history:', e);
    }
  }
}

// Initialize jobs from disk
loadJobs();

export interface StartRenderOptions {
  compositionUrl: string; // The URL to visit (e.g. /@fs/...)
  width?: number;
  height?: number;
  fps?: number;
  duration?: number; // Total duration of composition (used if no range)
  inPoint?: number;
  outPoint?: number;
  mode?: 'canvas' | 'dom';
  videoBitrate?: string;
  videoCodec?: string;
  pixelFormat?: string;
  inputProps?: Record<string, any>;
  concurrency?: number;
  hwAccel?: string;
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

export function getRenderJobSpec(options: StartRenderOptions): JobSpec {
  const projectRoot = getProjectRoot(process.cwd());
  let compositionPath: string;

  if (options.compositionUrl.startsWith('/@fs/')) {
      compositionPath = options.compositionUrl.slice(4); // Remove /@fs
  } else {
      // Remove leading slash if present to avoid absolute path confusion
      const relativePath = options.compositionUrl.startsWith('/') ? options.compositionUrl.slice(1) : options.compositionUrl;
      compositionPath = path.resolve(projectRoot, relativePath);
  }

  const compositionUrl = pathToFileURL(compositionPath).href;
  const outputDir = path.resolve(projectRoot, 'renders'); // Default output dir
  const jobId = Date.now().toString();
  const outputPath = path.resolve(outputDir, `render-${jobId}.mp4`);

  const fps = options.fps || 30;
  let durationInSeconds = options.duration || 10;
  let startFrame = 0;

  if (options.inPoint !== undefined && options.outPoint !== undefined) {
    startFrame = options.inPoint;
    const durationFrames = options.outPoint - options.inPoint;
    durationInSeconds = durationFrames / fps;
  }

  const renderOptions: DistributedRenderOptions = {
    width: options.width || 1920,
    height: options.height || 1080,
    fps: fps,
    durationInSeconds: durationInSeconds,
    startFrame: startFrame,
    frameCount: options.outPoint !== undefined ? (options.outPoint - options.inPoint!) : undefined,
    mode: options.mode || 'canvas',
    videoBitrate: options.videoBitrate,
    videoCodec: options.videoCodec,
    pixelFormat: options.pixelFormat,
    inputProps: options.inputProps,
    concurrency: options.concurrency || 1
  };

  const plan = RenderOrchestrator.plan(compositionUrl, outputPath, renderOptions);

  // Helper to normalize paths for cross-platform portability (forward slashes)
  const normalizePath = (p: string) => p.split(path.sep).join('/');

  // Convert absolute paths to relative to projectRoot for portability
  const relativeInput = normalizePath(path.relative(projectRoot, compositionPath));
  const relativeOutput = normalizePath(path.relative(projectRoot, outputPath));

  const chunks: RenderJobChunk[] = plan.chunks.map(chunk => {
    const flags = rendererOptionsToFlags(chunk.options);
    const relativeChunkOutput = normalizePath(path.relative(projectRoot, chunk.outputFile));

    return {
      id: chunk.id,
      startFrame: chunk.startFrame!,
      frameCount: chunk.frameCount!,
      outputFile: relativeChunkOutput,
      command: `helios render ${relativeInput} -o ${relativeChunkOutput} --start-frame ${chunk.startFrame} --frame-count ${chunk.frameCount} ${flags}`
    };
  });

  // Convert manifest paths to relative
  const relativeManifest = plan.concatManifest.map(f => normalizePath(path.relative(projectRoot, f)));

  let mergeCommand = `helios merge ${relativeOutput} ${relativeManifest.join(' ')}`;
  if (plan.mixOptions.videoCodec && plan.mixOptions.videoCodec !== 'copy') {
    mergeCommand += ` --video-codec ${plan.mixOptions.videoCodec}`;
  }
  if (plan.mixOptions.audioCodec) {
    mergeCommand += ` --audio-codec ${plan.mixOptions.audioCodec}`;
  }
  if (plan.mixOptions.crf !== undefined) {
    mergeCommand += ` --quality ${plan.mixOptions.crf}`;
  }

  return {
    metadata: {
      totalFrames: plan.totalFrames,
      fps,
      width: renderOptions.width!,
      height: renderOptions.height!,
      duration: plan.totalFrames / fps
    },
    chunks,
    mergeCommand
  };
}

export async function startRender(options: StartRenderOptions, serverPort: number): Promise<string> {
  const jobId = Date.now().toString();
  // Save to project root 'renders' directory
  const projectRoot = getProjectRoot(process.cwd());
  const rendersDir = path.resolve(projectRoot, 'renders');
  if (!fs.existsSync(rendersDir)) {
    fs.mkdirSync(rendersDir, { recursive: true });
  }

  const outputPath = path.resolve(rendersDir, `render-${jobId}.mp4`);
  const outputUrl = `/api/renders/render-${jobId}.mp4`;

  const job: RenderJob = {
    id: jobId,
    status: 'queued',
    progress: 0,
    compositionId: options.compositionUrl,
    outputPath,
    outputUrl,
    createdAt: Date.now(),
    inPoint: options.inPoint,
    outPoint: options.outPoint
  };

  jobs.set(jobId, job);
  await saveJobs();

  const controller = new AbortController();
  jobControllers.set(jobId, controller);

  // Run in background
  (async () => {
    try {
      job.status = 'rendering';
      await saveJobs();

      const fullUrl = `http://localhost:${serverPort}${options.compositionUrl}`;
      console.log(`[RenderManager] Starting render job ${jobId} for ${fullUrl} (concurrency: ${options.concurrency || 1})`);

      const fps = options.fps || 30;
      let durationInSeconds = options.duration || 10;
      let startFrame = 0;

      if (options.inPoint !== undefined && options.outPoint !== undefined) {
        startFrame = options.inPoint;
        const durationFrames = options.outPoint - options.inPoint;
        durationInSeconds = durationFrames / fps;
      }

      const renderOptions: DistributedRenderOptions = {
        width: options.width || 1920,
        height: options.height || 1080,
        fps: fps,
        durationInSeconds: durationInSeconds,
        startFrame: startFrame,
        mode: options.mode || 'canvas',
        videoBitrate: options.videoBitrate,
        videoCodec: options.videoCodec,
        pixelFormat: options.pixelFormat,
        inputProps: options.inputProps,
        concurrency: options.concurrency,
        hwAccel: options.hwAccel
      };

      await RenderOrchestrator.render(fullUrl, outputPath, renderOptions, {
        onProgress: (p) => {
          job.progress = p;
        },
        signal: controller.signal
      });

      // Verify file exists and has size
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size === 0) {
          throw new Error("Render produced an empty file.");
        }
      } else {
        throw new Error("Render output file not found.");
      }

      job.status = 'completed';
      job.progress = 1;
      await saveJobs();
      console.log(`[RenderManager] Job ${jobId} completed: ${outputPath}`);
    } catch (e: any) {
      if (e.message === 'Aborted') {
        console.log(`[RenderManager] Job ${jobId} was cancelled.`);
        job.status = 'cancelled';
      } else {
        console.error(`[RenderManager] Job ${jobId} failed:`, e);
        job.status = 'failed';
        job.error = e.message;
      }
      await saveJobs();
    } finally {
      jobControllers.delete(jobId);
    }
  })();

  return jobId;
}

export function getJob(id: string): RenderJob | undefined {
  return jobs.get(id);
}

export function getJobs(): RenderJob[] {
    return Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function cancelJob(id: string): Promise<boolean> {
  const job = jobs.get(id);
  const controller = jobControllers.get(id);

  if (job && controller) {
    console.log(`[RenderManager] Cancelling job ${id}...`);
    controller.abort();
    job.status = 'cancelled';
    await saveJobs();
    return true;
  }
  return false;
}

export async function deleteJob(id: string): Promise<boolean> {
  const job = jobs.get(id);
  if (!job) return false;

  // Prevent deleting running jobs
  if (job.status === 'rendering') return false;

  jobs.delete(id);
  await saveJobs();

  if (job.outputPath && fs.existsSync(job.outputPath)) {
    try {
      fs.unlinkSync(job.outputPath);
      console.log(`[RenderManager] Deleted output file for job ${id}`);
    } catch (e: any) {
      console.error(`[RenderManager] Failed to delete file ${job.outputPath}`, e);
    }
  }
  return true;
}

export async function diagnoseServer(): Promise<any> {
  console.log('[RenderManager] Running server diagnostics...');
  try {
    const renderer = new Renderer({ mode: 'canvas', width: 100, height: 100, fps: 30, durationInSeconds: 1 });
    return await renderer.diagnose();
  } catch (e: any) {
    console.error('[RenderManager] Diagnostics failed:', e);
    throw e;
  }
}
