import { FileJobRepository } from '../src/orchestrator/file-job-repository.js';
import { JobManager } from '../src/orchestrator/job-manager.js';
import { JobExecutor } from '../src/orchestrator/job-executor.js';
import { LocalWorkerAdapter } from '../src/adapters/local-adapter.js';
import { JobSpec } from '../src/types/job-spec.js';
import path from 'node:path';
import fs from 'node:fs/promises';

async function main() {
  console.log('--- FileJobRepository Example ---');

  const jobsDir = path.join(process.cwd(), '.tmp', 'jobs');

  // 1. Initialize FileJobRepository
  console.log(`\n1. Initializing FileJobRepository at ${jobsDir}...`);
  const repository = new FileJobRepository(jobsDir);

  // 2. Initialize Executor and Manager
  console.log('2. Initializing JobExecutor and JobManager...');
  const adapter = new LocalWorkerAdapter();
  const executor = new JobExecutor(adapter);
  const manager = new JobManager(repository, executor);

  // 3. Create a dummy JobSpec
  console.log('3. Creating a dummy JobSpec...');
  const jobSpec: JobSpec = {
    projectId: 'demo-project',
    frameRate: 30,
    resolution: { width: 1920, height: 1080 },
    durationMs: 3000,
    chunks: [
      { id: 1, startFrame: 0, endFrame: 29, command: 'sh -c "sleep 1 && echo Chunk 1 done"', outputFile: 'chunk1.mp4' },
      { id: 2, startFrame: 30, endFrame: 59, command: 'sh -c "sleep 1 && echo Chunk 2 done"', outputFile: 'chunk2.mp4' },
      { id: 3, startFrame: 60, endFrame: 89, command: 'sh -c "sleep 1 && echo Chunk 3 done"', outputFile: 'chunk3.mp4' },
    ],
    mergeCommand: 'sh -c "echo Merge done"',
    outputFile: 'final.mp4'
  };

  // 4. Submit Job
  console.log('\n4. Submitting Job...');
  const jobId = await manager.submitJob(jobSpec, {
    concurrency: 2,
    merge: false // Skip actual merge file verification for the dummy job
  });
  console.log(`Job submitted with ID: ${jobId}`);

  // 5. Monitor Job Status via Repository
  console.log('\n5. Monitoring Job Status (reading from file system)...');

  let isDone = false;
  while (!isDone) {
    const jobStatus = await manager.getJob(jobId);
    if (!jobStatus) {
      console.error('Job status not found!');
      break;
    }

    console.log(`[Status] State: ${jobStatus.state}, Progress: ${jobStatus.progress}% (${jobStatus.completedChunks}/${jobStatus.totalChunks})`);

    if (jobStatus.state === 'completed' || jobStatus.state === 'failed' || jobStatus.state === 'cancelled') {
      isDone = true;
      console.log(`\nJob finished with state: ${jobStatus.state}`);

      // Let's read the raw file directly to prove it's on disk
      const filePath = path.join(jobsDir, `${jobId}.json`);
      const rawFile = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(rawFile);
      console.log(`\n6. Verified raw file on disk: ${filePath}`);
      console.log(`File state: ${parsed.state}`);
      console.log(`Metrics: ${JSON.stringify(parsed.metrics)}`);
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 6. Cleanup
  console.log('\n7. Cleaning up...');
  await manager.deleteJob(jobId);
  console.log('Job deleted from repository.');

  try {
    // Attempt to remove the tmp jobs directory if empty
    await fs.rmdir(jobsDir);
    console.log('Temporary jobs directory removed.');
  } catch (err) {
    console.log('Could not remove temporary jobs directory (might not be empty).');
  }

  console.log('\n--- Example Complete ---');
}

main().catch(err => {
  console.error('Example failed:', err);
  process.exit(1);
});
