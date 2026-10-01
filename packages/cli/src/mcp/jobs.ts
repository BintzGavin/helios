import fs from 'fs';
import { randomUUID } from 'crypto';
import type { CliChild, CliRunner } from './cli-runner.js';
import { errorFromStderr, stripAnsi } from './cli-runner.js';

export type RenderStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface RenderJobSnapshot {
  [key: string]: unknown;
  jobId: string;
  status: RenderStatus;
  output: string;
  progress: number | null;
  elapsedSeconds: number;
  bytes?: number;
  error?: string;
  logTail?: string[];
}

export interface RenderJob {
  id: string;
  status: RenderStatus;
  /** Absolute output path. */
  output: string;
  /** Output path relative to the project root, as reported. */
  outputRel: string;
  /** The requested duration, when one was passed. */
  duration?: number;
  progress: number | null;
  startedAt: number;
  finishedAt?: number;
  bytes?: number;
  error?: string;
  /** Resolves once the job has reached a final status. */
  done: Promise<void>;
}

interface JobState extends RenderJob {
  child: CliChild;
  lines: string[];
  stderr: string;
  partial: { stdout: string; stderr: string };
  listeners: Set<(job: RenderJob) => void>;
  killTimer?: NodeJS.Timeout;
}

export class JobLimitError extends Error {}

export interface RenderJobsOptions {
  maxConcurrent?: number;
  /** How long cancel waits after SIGTERM before SIGKILL. */
  killGraceMs?: number;
  now?: () => number;
}

const MAX_LOG_LINES = 200;
const LOG_TAIL_LINES = 20;
const MAX_FINISHED_JOBS = 50;

/** The renderer logs "Progress: Rendered 12 / 60 frames". */
const PROGRESS_RE = /Rendered\s+(\d+)\s*\/\s*(\d+)\s+frames/;

/** In-memory render jobs: one `helios render` child process each. */
export class RenderJobs {
  private jobs = new Map<string, JobState>();
  private readonly maxConcurrent: number;
  private readonly killGraceMs: number;
  private readonly now: () => number;

  constructor(private readonly runner: CliRunner, private readonly cwd: string, options: RenderJobsOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 2;
    this.killGraceMs = options.killGraceMs ?? 5000;
    this.now = options.now ?? Date.now;
  }

  running(): RenderJob[] {
    return [...this.jobs.values()].filter((job) => job.status === 'running');
  }

  get(id: string): RenderJob | undefined {
    return this.jobs.get(id);
  }

  start(args: string[], output: { abs: string; rel: string }, duration?: number): RenderJob {
    const running = this.running();
    if (running.length >= this.maxConcurrent) {
      throw new JobLimitError(
        `A render is already running (jobId ${running.map((job) => job.id).join(', ')}). ` +
        'Wait for it with get_render_status, or stop it with cancel_render.',
      );
    }
    // Includes cancelled renders whose process hasn't exited yet: they may still write the file.
    const clash = [...this.jobs.values()].find((job) => job.finishedAt === undefined && job.output === output.abs);
    if (clash) {
      throw new JobLimitError(`A render to ${output.rel} is still running (jobId ${clash.id}); wait for it or pick another output.`);
    }
    this.prune();

    let id = `render-${randomUUID().slice(0, 8)}`;
    while (this.jobs.has(id)) id = `render-${randomUUID().slice(0, 8)}`;

    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => { resolveDone = resolve; });
    const job = {
      id,
      status: 'running',
      output: output.abs,
      outputRel: output.rel,
      duration,
      progress: null,
      startedAt: this.now(),
      done,
      lines: [],
      stderr: '',
      partial: { stdout: '', stderr: '' },
      listeners: new Set(),
    } as unknown as JobState;

    job.child = this.runner(args, {
      cwd: this.cwd,
      onStdout: (text) => this.onOutput(job, 'stdout', text),
      onStderr: (text) => this.onOutput(job, 'stderr', text),
    });
    this.jobs.set(id, job);

    job.child.exited.then(async (exit) => {
      if (job.killTimer) clearTimeout(job.killTimer);
      this.flushPartial(job);
      if (job.status === 'running') {
        if (exit.code === 0) {
          try {
            const stat = await fs.promises.stat(job.output);
            job.bytes = stat.size;
            job.status = 'completed';
            job.progress = 1;
          } catch {
            job.status = 'failed';
            job.error = `The render finished but ${job.outputRel} was not written`;
          }
        } else {
          job.status = 'failed';
          job.error = exit.error?.message
            || errorFromStderr(job.stderr, 'Render failed:')
            || `helios render exited with ${exit.signal ?? `code ${exit.code}`}`;
        }
      }
      job.finishedAt = this.now();
      this.emit(job);
      resolveDone();
    });
    return job;
  }

  /** Stops a running render: SIGTERM, then SIGKILL after the grace period. */
  cancel(id: string): RenderJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    if (job.status !== 'running') return job;
    job.status = 'cancelled';
    job.child.kill('SIGTERM');
    job.killTimer = setTimeout(() => job.child.kill('SIGKILL'), this.killGraceMs);
    job.killTimer.unref?.();
    this.emit(job);
    return job;
  }

  /** Cancels every running render and waits (up to the grace period plus a second) for them to exit. */
  async cancelAll(): Promise<void> {
    const running = this.running();
    for (const job of running) this.cancel(job.id);
    await Promise.race([
      Promise.all(running.map((job) => job.done)),
      new Promise((resolve) => setTimeout(resolve, this.killGraceMs + 1000).unref?.()),
    ]);
  }

  /** Waits until the job finishes, the timeout passes or the signal aborts, whichever comes first. */
  async wait(job: RenderJob, timeoutMs: number, signal?: AbortSignal): Promise<void> {
    if (job.status !== 'running' || timeoutMs <= 0 || signal?.aborted) return;
    let timer: NodeJS.Timeout | undefined;
    let onAbort: (() => void) | undefined;
    await Promise.race([
      job.done,
      new Promise<void>((resolve) => { timer = setTimeout(resolve, timeoutMs); }),
      new Promise<void>((resolve) => {
        onAbort = resolve;
        signal?.addEventListener('abort', onAbort, { once: true });
      }),
      // A cancel resolves the wait right away, without waiting for the process to exit.
      new Promise<void>((resolve) => {
        const off = this.subscribe(job, (j) => { if (j.status !== 'running') { off(); resolve(); } });
        job.done.then(off);
      }),
    ]);
    if (timer) clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }

  /** Calls fn whenever the job's progress or status changes; returns an unsubscribe function. */
  subscribe(job: RenderJob, fn: (job: RenderJob) => void): () => void {
    const state = this.jobs.get(job.id);
    if (!state) return () => {};
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  }

  snapshot(job: RenderJob): RenderJobSnapshot {
    const state = this.jobs.get(job.id);
    const end = job.finishedAt ?? this.now();
    const snapshot: RenderJobSnapshot = {
      jobId: job.id,
      status: job.status,
      output: job.outputRel,
      progress: job.progress,
      elapsedSeconds: Math.round((end - job.startedAt) / 100) / 10,
    };
    if (job.status === 'completed' && job.bytes !== undefined) snapshot.bytes = job.bytes;
    if (job.status === 'failed' && job.error) snapshot.error = job.error;
    if (state && state.lines.length > 0) snapshot.logTail = state.lines.slice(-LOG_TAIL_LINES);
    return snapshot;
  }

  private onOutput(job: JobState, stream: 'stdout' | 'stderr', text: string): void {
    if (stream === 'stderr') job.stderr = (job.stderr + text).slice(-64 * 1024);
    const combined = job.partial[stream] + text;
    const parts = combined.split(/\r?\n|\r/);
    job.partial[stream] = parts.pop() ?? '';
    for (const line of parts) this.addLine(job, line);
  }

  private flushPartial(job: JobState): void {
    for (const stream of ['stdout', 'stderr'] as const) {
      if (job.partial[stream]) this.addLine(job, job.partial[stream]);
      job.partial[stream] = '';
    }
  }

  private addLine(job: JobState, raw: string): void {
    const line = stripAnsi(raw).trimEnd();
    if (!line) return;
    job.lines.push(line);
    if (job.lines.length > MAX_LOG_LINES) job.lines.splice(0, job.lines.length - MAX_LOG_LINES);
    const match = PROGRESS_RE.exec(line);
    if (match && job.status === 'running') {
      const total = Number(match[2]);
      if (total > 0) {
        const progress = Math.min(1, Math.max(0, Number(match[1]) / total));
        if (job.progress === null || progress > job.progress) {
          job.progress = progress;
          this.emit(job);
        }
      }
    }
  }

  private emit(job: JobState): void {
    for (const fn of [...job.listeners]) {
      try {
        fn(job);
      } catch {
        // a listener's failure must not break the job
      }
    }
  }

  /** Forgets the oldest finished jobs once there are too many. */
  private prune(): void {
    const finished = [...this.jobs.values()].filter((job) => job.status !== 'running');
    for (const job of finished.slice(0, Math.max(0, finished.length - MAX_FINISHED_JOBS))) {
      this.jobs.delete(job.id);
    }
  }
}
