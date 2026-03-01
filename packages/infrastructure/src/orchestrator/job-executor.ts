import { WorkerAdapter, WorkerResult } from '../types/adapter.js';
import { JobSpec, RenderJobChunk } from '../types/job-spec.js';
import { VideoStitcher } from '../stitcher/ffmpeg-stitcher.js';
import { parseCommand } from '../utils/command.js';
import path from 'node:path';

export interface JobExecutionOptions {
  /**
   * Number of concurrent chunks to execute.
   * Defaults to 1.
   */
  concurrency?: number;

  /**
   * Directory to execute the job in.
   * Defaults to process.cwd().
   */
  jobDir?: string;

  /**
   * Whether to merge the output after all chunks are processed.
   * Defaults to true.
   */
  merge?: boolean;

  /**
   * Number of retries for failed chunks.
   * Defaults to 0.
   */
  retries?: number;

  /**
   * Delay in milliseconds between retries.
   * Defaults to 1000.
   */
  retryDelay?: number;

  /**
   * Callback invoked when a chunk successfully completes.
   */
  onProgress?: (completedChunks: number, totalChunks: number) => void;

  /**
   * Callback invoked when a chunk successfully completes with its result.
   */
  onChunkComplete?: (chunkId: number, result: WorkerResult) => void | Promise<void>;

  /**
   * Callback invoked when a chunk emits stdout data.
   */
  onChunkStdout?: (chunkId: number, data: string) => void;

  /**
   * Callback invoked when a chunk emits stderr data.
   */
  onChunkStderr?: (chunkId: number, data: string) => void;

  /**
   * Signal to abort the job execution.
   */
  signal?: AbortSignal;

  /**
   * Dedicated adapter for the merge step.
   * Useful when cloud adapters execute chunks but merging requires local access.
   */
  mergeAdapter?: WorkerAdapter;

  /**
   * Video stitcher to use for merging chunks instead of the merge command.
   */
  stitcher?: VideoStitcher;

  /**
   * Output file path relative to jobDir for the stitcher.
   */
  outputFile?: string;
}

export class JobExecutor {
  private adapter: WorkerAdapter;

  constructor(adapter: WorkerAdapter) {
    this.adapter = adapter;
  }

  /**
   * Executes a distributed render job using the configured worker adapter.
   */
  async execute(job: JobSpec, options: JobExecutionOptions = {}): Promise<void> {
    const concurrency = Math.max(1, options.concurrency || 1);
    const jobDir = options.jobDir || process.cwd();
    const shouldMerge = options.merge !== false;
    const maxRetries = options.retries || 0;
    const retryDelay = options.retryDelay || 1000;

    console.log(`Starting job execution with concurrency ${concurrency}...`);
    console.log(`Job Directory: ${jobDir}`);
    console.log(`Chunks: ${job.chunks.length}`);

    // Create a queue of chunks
    // We clone the chunks array so we don't modify the original job spec
    const queue = [...job.chunks];
    const totalChunks = job.chunks.length;
    let completedChunks = 0;

    // We need to track failures
    const failures: { chunkId: number, error: any }[] = [];
    let hasFailed = false;

    // Worker function to process chunks from the queue
    const worker = async (workerId: number) => {
      while (true) {
        if (options.signal?.aborted) {
          const abortError = new Error('Job aborted');
          abortError.name = 'AbortError';
          hasFailed = true;
          queue.length = 0;
          throw abortError;
        }

        // Atomic check and pop
        if (hasFailed || queue.length === 0) break;

        const chunk = queue.shift();
        if (!chunk) break;

        let attempt = 0;
        while (true) {
          if (options.signal?.aborted) {
            const abortError = new Error('Job aborted');
            abortError.name = 'AbortError';
            hasFailed = true;
            queue.length = 0;
            throw abortError;
          }

          try {
            console.log(`[Worker ${workerId}] Starting chunk ${chunk.id} (Attempt ${attempt + 1}/${maxRetries + 1})...`);

            const { command, args } = parseCommand(chunk.command);

            const result = await this.adapter.execute({
              command,
              args,
              cwd: jobDir,
              env: process.env as Record<string, string>,
              meta: {
                chunkId: chunk.id,
                ...chunk
              },
              signal: options.signal,
              onStdout: options.onChunkStdout ? (data) => options.onChunkStdout!(chunk.id, data) : undefined,
              onStderr: options.onChunkStderr ? (data) => options.onChunkStderr!(chunk.id, data) : undefined
            });

            if (result.exitCode !== 0) {
              throw new Error(`Chunk ${chunk.id} failed with exit code ${result.exitCode}: ${result.stderr}`);
            }

            completedChunks++;
            if (options.onProgress) {
              options.onProgress(completedChunks, totalChunks);
            }
            if (options.onChunkComplete) {
              await options.onChunkComplete(chunk.id, result);
            }
            console.log(`[Worker ${workerId}] Chunk ${chunk.id} completed (${completedChunks}/${totalChunks})`);
            break; // Success, break retry loop
          } catch (error: any) {
            if (attempt < maxRetries) {
              attempt++;
              console.warn(`[Worker ${workerId}] Chunk ${chunk.id} failed (Attempt ${attempt}/${maxRetries + 1}). Retrying in ${retryDelay}ms... Error: ${error.message}`);
              await new Promise(resolve => {
                const timeout = setTimeout(resolve, retryDelay);
                if (options.signal) {
                  options.signal.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    resolve(undefined);
                  }, { once: true });
                }
              });
              if (options.signal?.aborted) {
                const abortError = new Error('Job aborted');
                abortError.name = 'AbortError';
                hasFailed = true;
                queue.length = 0;
                throw abortError;
              }
              continue;
            }

            console.error(`[Worker ${workerId}] Chunk ${chunk.id} failed after ${attempt + 1} attempts:`, error.message);
            const wrappedError = new Error(`Chunk ${chunk.id} failed after ${attempt + 1} attempts: ${error.message}`);
            failures.push({ chunkId: chunk.id, error: wrappedError });
            hasFailed = true; // Signal other workers to stop
            queue.length = 0; // Clear the queue immediately
            throw wrappedError;
          }
        }
      }
    };

    // Start workers
    const activeWorkers = Array(Math.min(concurrency, totalChunks))
      .fill(null)
      .map((_, i) => worker(i + 1));

    // Wait for all workers to finish (either success or error)
    // We use Promise.allSettled to ensure we catch all errors but wait for everyone to stop
    const results = await Promise.allSettled(activeWorkers);

    // Check if any worker failed
    const rejected = results.find(r => r.status === 'rejected');
    if (rejected || failures.length > 0) {
      // If we have specific failure details, use the first one
      if (failures.length > 0) {
         throw failures[0].error;
      }
      // Otherwise use the rejection reason if available
      if (rejected && rejected.status === 'rejected') {
         throw rejected.reason;
      }
      throw new Error('Job execution failed: Unknown error');
    }

    // Merge step
    if (shouldMerge) {
      if (options.stitcher && options.outputFile) {
        console.log('All chunks completed. Starting merge step using dedicated VideoStitcher...');

        try {
          // Sort chunks by ID to ensure correct order
          const sortedChunks = [...job.chunks].sort((a, b) => a.id - b.id);
          const inputs = sortedChunks.map(c => path.resolve(jobDir, c.outputFile));
          const output = path.resolve(jobDir, options.outputFile);

          await options.stitcher.stitch(inputs, output);
          console.log('Merge completed successfully via VideoStitcher.');
        } catch (error: any) {
          console.error('Merge step failed:', error.message);
          throw error;
        }
      } else if (job.mergeCommand) {
        console.log('All chunks completed. Starting merge step via mergeCommand...');

        if (options.stitcher && !options.outputFile) {
          console.warn('Warning: stitcher provided but outputFile is missing. Falling back to mergeCommand.');
        }

        try {
          const { command, args } = parseCommand(job.mergeCommand);
          const mergeAdapter = options.mergeAdapter || this.adapter;

          const result = await mergeAdapter.execute({
            command,
            args,
            cwd: jobDir,
            env: process.env as Record<string, string>,
            signal: options.signal
          });

          if (result.exitCode !== 0) {
            throw new Error(`Merge failed with exit code ${result.exitCode}: ${result.stderr}`);
          }

          console.log('Merge completed successfully.');
        } catch (error: any) {
          console.error('Merge step failed:', error.message);
          throw error;
        }
      } else {
        console.log('Skipping merge step (no merge mechanism provided).');
      }
    } else {
      console.log('Skipping merge step (disabled in options).');
    }
  }
}
