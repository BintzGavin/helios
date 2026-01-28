// @ts-ignore - Importing from sibling package source to avoid build issues
import { Renderer } from '../../../renderer/src/index';
import path from 'path';
import fs from 'fs';
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

const jobs = new Map<string, RenderJob>();
const jobControllers = new Map<string, AbortController>();

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
  const controller = new AbortController();
  jobControllers.set(jobId, controller);

  // Run in background
  (async () => {
    try {
      job.status = 'rendering';

      const fullUrl = `http://localhost:${serverPort}${options.compositionUrl}`;
      console.log(`[RenderManager] Starting render job ${jobId} for ${fullUrl}`);

      const fps = options.fps || 30;
      let durationInSeconds = options.duration || 10;
      let startFrame = 0;

      if (options.inPoint !== undefined && options.outPoint !== undefined) {
        startFrame = options.inPoint;
        const durationFrames = options.outPoint - options.inPoint;
        durationInSeconds = durationFrames / fps;
      }

      const renderer = new Renderer({
        width: options.width || 1920,
        height: options.height || 1080,
        fps: fps,
        durationInSeconds: durationInSeconds,
        startFrame: startFrame,
        mode: options.mode || 'canvas',
        videoBitrate: options.videoBitrate,
        videoCodec: options.videoCodec,
        pixelFormat: options.pixelFormat,
        inputProps: options.inputProps
      });

      await renderer.render(fullUrl, outputPath, {
        onProgress: (p) => {
          job.progress = p;
        },
        signal: controller.signal
      });

      job.status = 'completed';
      job.progress = 1;
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

export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  const controller = jobControllers.get(id);

  if (job && controller) {
    console.log(`[RenderManager] Cancelling job ${id}...`);
    controller.abort();
    job.status = 'cancelled';
    return true;
  }
  return false;
}

export function deleteJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;

  // Prevent deleting running jobs
  if (job.status === 'rendering') return false;

  jobs.delete(id);
  if (job.outputPath && fs.existsSync(job.outputPath)) {
    try {
      fs.unlinkSync(job.outputPath);
      console.log(`[RenderManager] Deleted output file for job ${id}`);
    } catch (e) {
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
