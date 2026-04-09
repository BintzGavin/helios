import { spawn, ChildProcess } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { once } from 'events';
import { RendererOptions, RenderJobOptions } from '../types.js';

export class FFmpegManager {
  private process: ChildProcess | null = null;
  public ffmpegPath: string;

  constructor(private options: RendererOptions, private jobOptions?: RenderJobOptions) {
    this.ffmpegPath = this.options.ffmpegPath || ffmpeg.path;
  }

  public spawn(args: string[], inputBuffers: { index: number; buffer: Buffer }[]): ChildProcess {
    const stdio: any[] = ['pipe', 'pipe', 'pipe'];
    const maxPipeIndex = Math.max(...inputBuffers.map(b => b.index), 2);
    while (stdio.length <= maxPipeIndex) {
      stdio.push('pipe');
    }

    this.process = spawn(this.ffmpegPath, args, { stdio });
    console.log(`Spawning FFmpeg: ${this.ffmpegPath} ${args.join(' ')}`);

    inputBuffers.forEach(({ index, buffer }) => {
      const pipe = this.process!.stdio[index] as any;
      if (pipe) {
        pipe.on('error', (err: any) => {
          if (err && err.code === 'EPIPE') {
            console.warn(`Pipe ${index} closed prematurely (EPIPE). Ignoring.`);
          } else {
            console.error(`Error writing to pipe ${index}:`, err);
          }
        });
        pipe.write(buffer);
        pipe.end();
      } else {
        console.error(`Failed to get pipe ${index} from FFmpeg process`);
      }
    });

    this.process.stderr!.on('data', (data: Buffer) => {
      console.error(`ffmpeg: ${data.toString()}`);
    });

    return this.process;
  }

  public getExitPromise(capturedErrors: Error[]): Promise<void> {
    if (!this.process) return Promise.reject(new Error('FFmpeg process not spawned'));

    return new Promise<void>((resolve, reject) => {
      this.process!.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          if (this.jobOptions?.signal?.aborted || capturedErrors.length > 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg process exited with code ${code}`));
          }
        }
      });
      this.process!.on('error', (err: Error) => {
          if (this.jobOptions?.signal?.aborted || capturedErrors.length > 0) {
            resolve();
          } else {
            reject(err);
          }
      });
    });
  }

  public kill() {
    if (this.process && !this.process.killed) {
      this.process.kill();
    }
  }

  public get stdin() {
    return this.process?.stdin;
  }

  public emitError(err: Error) {
    this.process?.emit('error', err);
  }
}
