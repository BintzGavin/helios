import {
  S3StorageAdapter,
  JobManager,
  FileJobRepository,
  JobExecutor,
  LocalWorkerAdapter,
} from '../src/index.js';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('--- S3 Artifact Storage Example ---');

  const region = process.env.AWS_REGION;
  const bucketName = process.env.AWS_BUCKET_NAME;

  if (!region || !bucketName) {
    console.log(
      '⚠️  Missing required environment variables: AWS_REGION and/or AWS_BUCKET_NAME.'
    );
    console.log(
      'Please set these variables and ensure you have valid AWS credentials configured (e.g., via AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY).'
    );
    console.log('Exiting gracefully.');
    return;
  }

  console.log(`Using AWS Region: ${region}`);
  console.log(`Using S3 Bucket: ${bucketName}`);

  // Initialize Storage Adapter
  const storage = new S3StorageAdapter({
    bucket: bucketName,
    region,
  });

  // Initialize Orchestrator Components
  const storageDir = path.join(__dirname, '.job-store');
  const repository = new FileJobRepository(storageDir);
  const workerAdapter = new LocalWorkerAdapter();
  const executor = new JobExecutor(workerAdapter);
  const manager = new JobManager(repository, executor, storage);

  // Create a mock JobSpec
  const mockJobSpec = {
    id: randomUUID(),
    metadata: {
      totalFrames: 10,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 0.33,
    },
    chunks: [
      {
        id: 0,
        startFrame: 0,
        frameCount: 10,
        outputFile: 'chunk-0.mp4',
        command: 'echo "mock render"',
      },
    ],
    mergeCommand: 'echo "mock merge"',
  };

  try {
    console.log(`Submitting Job ID: ${mockJobSpec.id}...`);
    // Note: In a real scenario, JobManager handles uploading if storage is provided
    const jobId = await manager.submitJob(mockJobSpec);
    console.log(`Job successfully submitted and stored with ID: ${jobId}`);

    // Clean up local mock storage
    console.log('Cleaning up mock job repository...');
    const fs = await import('fs/promises');
    await fs.rm(storageDir, { recursive: true, force: true });

    console.log('Example complete.');
  } catch (error) {
    console.error('Error executing example:', error);
    process.exit(1);
  }
}

main().catch(console.error);
