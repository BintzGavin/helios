import fs from 'node:fs/promises';
import path from 'node:path';
import { AwsLambdaAdapter } from '../src/adapters/aws-adapter.js';
import { JobExecutor, JobManager, FileJobRepository } from '../src/orchestrator/index.js';
import { JobSpec } from '../src/types/job-spec.js';
import { randomUUID } from 'node:crypto';

async function main() {
  console.log('=== AWS Lambda Adapter Example ===');
  console.log('This example demonstrates how to configure and use the AwsLambdaAdapter');
  console.log('with the JobManager to execute distributed rendering jobs on AWS Lambda.');
  console.log('NOTE: This script uses mock configuration. If you provide real AWS credentials');
  console.log('      and a deployed Lambda function, it will attempt actual execution.\n');

  const region = process.env.AWS_REGION || 'us-east-1';
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || 'helios-renderer-worker';
  const jobDefUrl = 'https://example.com/jobs/mock-job.json';

  const storageDir = path.join(process.cwd(), '.helios', 'jobs', 'aws-example');

  console.log('Configuration:');
  console.log(`- AWS Region: ${region}`);
  console.log(`- Function Name: ${functionName}`);
  console.log(`- Job Definition URL: ${jobDefUrl}`);
  console.log(`- Local Storage Dir: ${storageDir}\n`);

  console.log('Initializing components...');
  const adapter = new AwsLambdaAdapter({ region, functionName, jobDefUrl });
  const executor = new JobExecutor(adapter);
  const repository = new FileJobRepository(storageDir);
  const manager = new JobManager(repository, executor);
  console.log('Components initialized successfully.\n');

  console.log('Creating job specification...');
  const jobId = randomUUID();
  const jobSpec: JobSpec = {
    id: jobId,
    metadata: { totalFrames: 60, fps: 30, width: 1920, height: 1080, duration: 2 },
    chunks: [
      { id: 0, startFrame: 0, frameCount: 30, outputFile: `chunk_0.mp4`, command: `npx helios render --chunk 0 --url https://example.com/animation` },
      { id: 1, startFrame: 30, frameCount: 30, outputFile: `chunk_1.mp4`, command: `npx helios render --chunk 1 --url https://example.com/animation` }
    ],
    mergeCommand: `ffmpeg -f concat -i chunks.txt -c copy output.mp4`
  };
  console.log(`Job Spec created with ${jobSpec.chunks.length} chunks.\n`);

  console.log('Submitting job...');
  try {
    const submittedId = await manager.submitJob(jobSpec, { concurrency: 2, jobDir: process.cwd() });
    console.log(`Job submitted successfully. ID: ${submittedId}`);

    const initialStatus = await manager.getJob(submittedId);
    console.log(`Initial status: ${initialStatus?.state}`);

    console.log('\nWaiting for execution to complete (or fail)...');

    let isComplete = false;
    let attempts = 0;
    while (!isComplete && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status = await manager.getJob(submittedId);

      if (!status) { console.error('Job not found!'); break; }

      console.log(`Status update: [${status.state}] Progress: ${status.progress}% (${status.completedChunks}/${status.totalChunks} chunks)`);

      if (status.state === 'completed' || status.state === 'failed' || status.state === 'cancelled') {
        isComplete = true;
        console.log(`\nFinal Job State: ${status.state}`);
        if (status.error) {
          if (status.error.includes('Could not load credentials')) {
            console.log('Expected credential error received since no real AWS credentials were provided.');
          } else {
            console.log(`Error Details: ${status.error}`);
          }
        }
      }
      attempts++;
    }

    if (!isComplete) {
      console.log('\nPolling timed out (this is expected for this mock example).');
      console.log('Cancelling job...');
      await manager.cancelJob(submittedId);
      const finalStatus = await manager.getJob(submittedId);
      console.log(`Job state after cancellation: ${finalStatus?.state}`);
    }

  } catch (error: any) {
    console.error(`\nFailed to submit job: ${error.message}`);
  } finally {
    console.log('\nCleaning up local storage...');
    try {
      await fs.rm(storageDir, { recursive: true, force: true });
      console.log('Cleanup successful.');
    } catch (error: any) {
      console.warn(`Failed to cleanup: ${error.message}`);
    }
    console.log('\nExample finished.');
  }
}

main().catch(console.error);