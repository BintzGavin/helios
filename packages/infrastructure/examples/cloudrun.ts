import fs from 'node:fs/promises';
import path from 'node:path';
import { CloudRunAdapter } from '../src/adapters/cloudrun-adapter.js';
import { JobExecutor, JobManager, FileJobRepository } from '../src/orchestrator/index.js';
import { JobSpec } from '../src/types/job-spec.js';
import { randomUUID } from 'node:crypto';

async function main() {
  console.log('=== Google Cloud Run Adapter Example ===');
  console.log('This example demonstrates how to configure and use the CloudRunAdapter');
  console.log('with the JobManager to execute distributed rendering jobs on Google Cloud Run.');
  console.log('NOTE: This script uses mock configuration. If you provide real GCP credentials');
  console.log('      and a deployed Cloud Run service URL, it will attempt actual execution.\\n');

  // 1. Setup Configuration
  // In a real application, these would come from environment variables or configuration files.
  const serviceUrl = process.env.GCP_SERVICE_URL || 'https://mock-helios-worker-abcdefg-uc.a.run.app';
  const jobDefUrl = process.env.GCP_JOB_DEF_URL || 'https://example.com/jobs/mock-job.json';

  const storageDir = path.join(process.cwd(), '.helios', 'jobs', 'cloudrun-example');

  console.log('Configuration:');
  console.log(`- Cloud Run Service URL: ${serviceUrl}`);
  console.log(`- Job Definition URL: ${jobDefUrl}`);
  console.log(`- Local Storage Dir: ${storageDir}\\n`);

  // 2. Initialize Components
  console.log('Initializing components...');

  // Create the adapter
  const adapter = new CloudRunAdapter({
    serviceUrl,
    jobDefUrl
  });

  // Create the executor, wrapping the adapter
  const executor = new JobExecutor(adapter);

  // Create a local repository for job state
  const repository = new FileJobRepository(storageDir);

  // Create the manager
  const manager = new JobManager(repository, executor);
  console.log('Components initialized successfully.\\n');

  // 3. Define a Job Specification
  console.log('Creating job specification...');
  const jobId = randomUUID();
  const jobSpec: JobSpec = {
    id: jobId,
    metadata: {
      totalFrames: 60,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 2
    },
    chunks: [
      {
        id: 0,
        startFrame: 0,
        frameCount: 30,
        outputFile: `chunk_0.mp4`,
        command: `npx helios render --chunk 0 --url https://example.com/animation`
      },
      {
        id: 1,
        startFrame: 30,
        frameCount: 30,
        outputFile: `chunk_1.mp4`,
        command: `npx helios render --chunk 1 --url https://example.com/animation`
      }
    ],
    mergeCommand: `ffmpeg -f concat -i chunks.txt -c copy output.mp4`
  };
  console.log(`Job Spec created with ${jobSpec.chunks.length} chunks.\\n`);

  // 4. Submit the Job
  console.log('Submitting job...');
  try {
    const submittedId = await manager.submitJob(jobSpec, {
      concurrency: 2, // Cloud Run scales automatically, but we control parallel invocations here
      jobDir: process.cwd()
    });
    console.log(`Job submitted successfully. ID: ${submittedId}`);

    // Check initial status
    const initialStatus = await manager.getJob(submittedId);
    console.log(`Initial status: ${initialStatus?.state}`);

    console.log('\\nWaiting for execution to complete (or fail)...');

    // Poll for status updates
    let isComplete = false;
    let attempts = 0;
    while (!isComplete && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status = await manager.getJob(submittedId);

      if (!status) {
        console.error('Job not found!');
        break;
      }

      console.log(`Status update: [${status.state}] Progress: ${status.progress}% (${status.completedChunks}/${status.totalChunks} chunks)`);

      if (status.state === 'completed' || status.state === 'failed' || status.state === 'cancelled') {
        isComplete = true;
        console.log(`\\nFinal Job State: ${status.state}`);
        if (status.error) {
          console.log(`Error Details: ${status.error}`);
        }
      }
      attempts++;
    }

    if (!isComplete) {
      console.log('\\nPolling timed out (this is expected for this mock example).');
      console.log('Cancelling job...');
      await manager.cancelJob(submittedId);
      const finalStatus = await manager.getJob(submittedId);
      console.log(`Job state after cancellation: ${finalStatus?.state}`);
    }

  } catch (error: any) {
    console.error(`\\nFailed to submit job: ${error.message}`);
  } finally {
    // 5. Cleanup
    console.log('\\nCleaning up local storage...');
    try {
      await fs.rm(storageDir, { recursive: true, force: true });
      console.log('Cleanup successful.');
    } catch (error: any) {
      console.warn(`Failed to cleanup: ${error.message}`);
    }
    console.log('\\nExample finished.');
  }
}

main().catch(console.error);
