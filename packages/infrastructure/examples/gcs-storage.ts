import {
  GcsStorageAdapter,
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
  console.log('--- GCS Artifact Storage Example ---');

  const projectId = process.env.GCP_PROJECT_ID;
  const bucketName = process.env.GCP_BUCKET_NAME;

  if (!projectId || !bucketName) {
    console.log(
      '⚠️  Missing required environment variables: GCP_PROJECT_ID and/or GCP_BUCKET_NAME.'
    );
    console.log(
      'Please set these variables and ensure you have valid GCP credentials configured (e.g., via GOOGLE_APPLICATION_CREDENTIALS).'
    );
    console.log('Exiting gracefully.');
    return;
  }

  console.log(`Using GCP Project ID: ${projectId}`);
  console.log(`Using GCS Bucket: ${bucketName}`);

  // Initialize Storage Adapter
  const storage = new GcsStorageAdapter({
    projectId,
    bucket: bucketName,
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
