import { WorkerAdapter } from '../types/adapter.js';
import { JobSpec, RenderJobChunk } from '../types/job-spec.js';
import { parseCommand } from '../utils/command.js';

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
        // Atomic check and pop
        if (hasFailed || queue.length === 0) break;

        const chunk = queue.shift();
        if (!chunk) break;

        try {
          console.log(`[Worker ${workerId}] Starting chunk ${chunk.id}...`);

          const { command, args } = parseCommand(chunk.command);

          const result = await this.adapter.execute({
            command,
            args,
            cwd: jobDir,
            env: process.env as Record<string, string>
          });

          if (result.exitCode !== 0) {
             throw new Error(`Chunk ${chunk.id} failed with exit code ${result.exitCode}: ${result.stderr}`);
          }

          completedChunks++;
          console.log(`[Worker ${workerId}] Chunk ${chunk.id} completed (${completedChunks}/${totalChunks})`);
        } catch (error: any) {
          console.error(`[Worker ${workerId}] Chunk ${chunk.id} failed:`, error.message);
          failures.push({ chunkId: chunk.id, error });
          hasFailed = true; // Signal other workers to stop
          queue.length = 0; // Clear the queue immediately
          throw error;
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
    if (shouldMerge && job.mergeCommand) {
      console.log('All chunks completed. Starting merge step...');

      try {
        const { command, args } = parseCommand(job.mergeCommand);

        const result = await this.adapter.execute({
          command,
          args,
          cwd: jobDir,
          env: process.env as Record<string, string>
        });

        if (result.exitCode !== 0) {
          throw new Error(`Merge failed with exit code ${result.exitCode}: ${result.stderr}`);
        }

        console.log('Merge completed successfully.');
      } catch (error: any) {
        console.error('Merge step failed:', error.message);
        throw error;
      }
    } else if (!shouldMerge) {
      console.log('Skipping merge step (disabled in options).');
    } else {
      console.log('Skipping merge step (no merge command provided).');
    }
  }
}
