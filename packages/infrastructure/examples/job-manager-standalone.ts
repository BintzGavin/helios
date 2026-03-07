import {
  JobManager,
  JobExecutor,
  LocalWorkerAdapter,
  FileJobRepository,
  JobSpec
} from '../src/index.js';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as os from 'os';

/**
 * Example: Standalone JobManager Usage
 *
 * This script demonstrates how to instantiate and use the top-level `JobManager`
 * orchestrator to manage the complete lifecycle of a simulated distributed rendering job.
 *
 * The `JobManager` acts as the single point of entry, abstracting away the complexities
 * of job state persistence, chunk dispatching, and asynchronous progress tracking.
 */
async function runExample() {
  console.log('🚀 Initializing JobManager Example...');

  // 1. Setup temporary directory for the file-based repository and outputs
  const tmpDir = os.tmpdir();
  const repoDir = path.join(tmpDir, 'job-manager-example-repo');
  const outputDir = path.join(tmpDir, 'job-manager-example-output');

  console.log(`📂 Repository Directory: ${repoDir}`);
  console.log(`📂 Output Directory: ${outputDir}\n`);

  // 2. Instantiate dependencies
  // The repository handles persisting job state (pending, running, completed, etc.)
  const repository = new FileJobRepository(repoDir);

  // The adapter actually executes the work (locally in this case)
  const workerAdapter = new LocalWorkerAdapter();

  // The executor orchestrates breaking the job into chunks and sending them to the adapter
  const executor = new JobExecutor(workerAdapter);

  // 3. Create the JobManager
  // The manager ties the repository and executor together
  const jobManager = new JobManager(repository, executor);

  // 4. Define a mock Job Specification
  // This simulates a rendering job that has been split into 3 manageable chunks
  const jobId = randomUUID();
  const jobSpec: JobSpec = {
    id: jobId,
    metadata: {
      totalFrames: 300,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 10
    },
    chunks: [
      {
        id: 0,
        startFrame: 0,
        frameCount: 100,
        outputFile: path.join(outputDir, 'chunk_0.mp4'),
        // Simulate work by sleeping for 1 second
        command: 'node -e "setTimeout(() => console.log(\'Chunk 0 done\'), 1000)"'
      },
      {
        id: 1,
        startFrame: 100,
        frameCount: 100,
        outputFile: path.join(outputDir, 'chunk_1.mp4'),
        // Simulate work by sleeping for 1 second
        command: 'node -e "setTimeout(() => console.log(\'Chunk 1 done\'), 1000)"'
      },
      {
        id: 2,
        startFrame: 200,
        frameCount: 100,
        outputFile: path.join(outputDir, 'chunk_2.mp4'),
        // Simulate work by sleeping for 1 second
        command: 'node -e "setTimeout(() => console.log(\'Chunk 2 done\'), 1000)"'
      }
    ],
    // The command to merge the completed chunks into a final output
    mergeCommand: 'node -e "console.log(\'Merging chunks into final output...\')"'
  };

  console.log(`📝 Submitting Job ${jobId}...`);
  console.log(`   Total Chunks: ${jobSpec.chunks.length}\n`);

  // 5. Submit the Job
  // The manager saves the job in 'pending' state and immediately starts background execution
  const submittedId = await jobManager.submitJob(jobSpec);

  // 6. Monitor Job Progress
  // We periodically poll the repository via the manager to check status
  console.log('⏱️  Monitoring Job Progress...\n');

  return new Promise<void>((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await jobManager.getJob(submittedId);

        if (!status) {
          console.warn(`⚠️  Job ${submittedId} not found!`);
          clearInterval(pollInterval);
          reject(new Error('Job not found'));
          return;
        }

        console.log(`📊 Status: [${status.state.toUpperCase()}] | Progress: ${status.progress}% | Chunks: ${status.completedChunks}/${status.totalChunks}`);

        if (status.state === 'completed') {
          clearInterval(pollInterval);
          console.log('\n✅ Job completed successfully!');
          console.log('📈 Final Metrics:');
          console.log(`   - Total Execution Time (chunks combined): ${status.metrics?.totalDurationMs}ms`);
          console.log('📋 Job Logs (first chunk):');
          console.log(`   STDOUT: ${status.logs?.[0]?.stdout?.trim()}`);
          resolve();
        } else if (status.state === 'failed' || status.state === 'cancelled') {
          clearInterval(pollInterval);
          console.error(`\n❌ Job ended with state: ${status.state}`);
          if (status.error) console.error(`   Error: ${status.error}`);
          reject(new Error(`Job failed or cancelled: ${status.state}`));
        }
      } catch (err) {
        clearInterval(pollInterval);
        reject(err);
      }
    }, 500); // Poll every 500ms
  });
}

runExample().catch(err => {
  console.error('Example failed:', err);
  process.exit(1);
});
