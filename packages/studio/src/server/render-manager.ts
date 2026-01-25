// @ts-ignore - Importing from sibling package source to avoid build issues
import { Renderer } from '../../../renderer/src/index';
import path from 'path';
import fs from 'fs';

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number;
  compositionId: string; // The URL/Path
  outputPath?: string;
  error?: string;
  createdAt: number;
  inPoint?: number;
  outPoint?: number;
}

const jobs = new Map<string, RenderJob>();

export interface StartRenderOptions {
  compositionUrl: string; // The URL to visit (e.g. /@fs/...)
  width?: number;
  height?: number;
  fps?: number;
  duration?: number; // Total duration of composition (used if no range)
  inPoint?: number;
  outPoint?: number;
  mode?: 'canvas' | 'dom';
}

export async function startRender(options: StartRenderOptions, serverPort: number): Promise<string> {
  const jobId = Date.now().toString();
  // Save to project root 'renders' directory
  const rendersDir = path.resolve(process.cwd(), 'renders');
  if (!fs.existsSync(rendersDir)) {
    fs.mkdirSync(rendersDir, { recursive: true });
  }

  const outputPath = path.resolve(rendersDir, `render-${jobId}.mp4`);

  const job: RenderJob = {
    id: jobId,
    status: 'queued',
    progress: 0,
    compositionId: options.compositionUrl,
    outputPath,
    createdAt: Date.now(),
    inPoint: options.inPoint,
    outPoint: options.outPoint
  };

  jobs.set(jobId, job);

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
        mode: options.mode || 'canvas'
      });

      await renderer.render(fullUrl, outputPath, {
        onProgress: (p) => {
          job.progress = p;
        }
      });

      job.status = 'completed';
      job.progress = 1;
      console.log(`[RenderManager] Job ${jobId} completed: ${outputPath}`);
    } catch (e: any) {
      console.error(`[RenderManager] Job ${jobId} failed:`, e);
      job.status = 'failed';
      job.error = e.message;
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
