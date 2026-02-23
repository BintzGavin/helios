import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { JobSpec } from '../types/job.js';

export async function loadJobSpec(file: string): Promise<{ jobSpec: JobSpec, jobDir: string }> {
  if (file.startsWith('http://') || file.startsWith('https://')) {
    const res = await fetch(file);
    if (!res.ok) {
      throw new Error(`Failed to fetch job: ${res.statusText} (${res.status})`);
    }
    const jobSpec = (await res.json()) as JobSpec;
    return { jobSpec, jobDir: process.cwd() };
  } else {
    const jobPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(jobPath)) {
      throw new Error(`Job file not found: ${jobPath}`);
    }
    const jobSpec = JSON.parse(fs.readFileSync(jobPath, 'utf-8')) as JobSpec;
    return { jobSpec, jobDir: path.dirname(jobPath) };
  }
}

export function registerJobCommand(program: Command) {
  const jobCommand = program
    .command('job')
    .description('Manage distributed rendering jobs');

  jobCommand
    .command('run <file>')
    .description('Execute a distributed render job from a JSON spec')
    .option('--chunk <id>', 'Execute only the chunk with the specified ID')
    .option('--concurrency <number>', 'Number of concurrent chunks to run locally', '1')
    .option('--no-merge', 'Skip the final merge step')
    .action(async (file, options) => {
      try {
        const { jobSpec, jobDir } = await loadJobSpec(file);
        const chunkId = options.chunk ? parseInt(options.chunk, 10) : undefined;

        if (chunkId !== undefined && isNaN(chunkId)) {
          throw new Error('Chunk ID must be a valid number');
        }

        const concurrency = parseInt(options.concurrency, 10);
        if (isNaN(concurrency) || concurrency < 1) {
          throw new Error('Concurrency must be a positive number');
        }

        const chunksToRun = chunkId !== undefined
          ? jobSpec.chunks.filter(c => c.id === chunkId)
          : jobSpec.chunks;

        if (chunkId !== undefined && chunksToRun.length === 0) {
          throw new Error(`Chunk ${chunkId} not found in job spec`);
        }

        console.log(`Found ${chunksToRun.length} chunks to execute.`);

        // Execution function
        const executeChunk = async (chunk: typeof jobSpec.chunks[0]) => {
          console.log(`Starting chunk ${chunk.id}...`);
          return new Promise<void>((resolve, reject) => {
            const child = spawn(chunk.command, {
              stdio: 'inherit',
              shell: true,
              cwd: jobDir
            });

            child.on('close', (code) => {
              if (code === 0) {
                console.log(`Chunk ${chunk.id} completed successfully.`);
                resolve();
              } else {
                reject(new Error(`Chunk ${chunk.id} failed with exit code ${code}`));
              }
            });

            child.on('error', (err) => {
              reject(new Error(`Chunk ${chunk.id} failed to start: ${err.message}`));
            });
          });
        };

        // Worker Queue Pattern for Concurrency
        const queue = [...chunksToRun];
        const worker = async () => {
          while (queue.length > 0) {
            const chunk = queue.shift();
            if (chunk) {
              await executeChunk(chunk);
            }
          }
        };

        const workers = Array(Math.min(concurrency, chunksToRun.length))
          .fill(null)
          .map(() => worker());

        await Promise.all(workers);

        // Run merge command if appropriate
        if (options.merge && chunkId === undefined) {
          console.log('Starting merge step...');
          await new Promise<void>((resolve, reject) => {
            const child = spawn(jobSpec.mergeCommand, {
              stdio: 'inherit',
              shell: true,
              cwd: jobDir
            });

            child.on('close', (code) => {
              if (code === 0) {
                console.log('Merge completed successfully.');
                resolve();
              } else {
                reject(new Error(`Merge failed with exit code ${code}`));
              }
            });

            child.on('error', (err) => {
              reject(new Error(`Merge failed to start: ${err.message}`));
            });
          });
        } else if (!options.merge) {
          console.log('Skipping merge step (--no-merge provided).');
        } else {
          console.log('Skipping merge step (single chunk execution).');
        }

      } catch (err: any) {
        console.error('Job execution failed:', err.message);
        process.exit(1);
      }
    });
}
