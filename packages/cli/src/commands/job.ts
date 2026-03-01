import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { JobSpec } from '../types/job.js';
import { JobExecutor, LocalWorkerAdapter } from '@helios-project/infrastructure';

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

        let completedChunkIds: number[] | undefined;

        if (chunkId !== undefined) {
          const chunkExists = jobSpec.chunks.some(c => c.id === chunkId);
          if (!chunkExists) {
            throw new Error(`Chunk ${chunkId} not found in job spec`);
          }
          completedChunkIds = jobSpec.chunks
            .map(c => c.id)
            .filter(id => id !== chunkId);
        }

        const shouldMerge = options.merge && chunkId === undefined;

        const adapter = new LocalWorkerAdapter();
        const executor = new JobExecutor(adapter);

        // Ensure jobSpec has an id to satisfy infrastructure JobSpec interface
        const infrastructureJobSpec = {
          ...jobSpec,
          id: (jobSpec as any).id || `job-${Date.now()}`
        };

        await executor.execute(infrastructureJobSpec as any, {
          concurrency,
          jobDir,
          merge: shouldMerge,
          completedChunkIds,
          onChunkStdout: (id: number, data: string) => process.stdout.write(data),
          onChunkStderr: (id: number, data: string) => process.stderr.write(data)
        });

      } catch (err: any) {
        console.error('Job execution failed:', err.message);
        process.exit(1);
      }
    });
}
