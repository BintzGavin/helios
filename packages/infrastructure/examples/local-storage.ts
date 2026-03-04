import {
  LocalStorageAdapter,
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
  console.log('--- Local Artifact Storage Example ---');

  const baseDir = path.join(__dirname, '.local-bucket');
  console.log(`Using Local Storage Base Directory: ${baseDir}`);

  // Initialize Storage Adapter
  const storage = new LocalStorageAdapter({
    storageDir: baseDir,
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
    console.log('Cleaning up mock job repository and local storage bucket...');
    const fs = await import('fs/promises');
    await fs.rm(storageDir, { recursive: true, force: true });
    await fs.rm(baseDir, { recursive: true, force: true });

    console.log('Example complete.');
  } catch (error) {
    console.error('Error executing example:', error);
    process.exit(1);
  }
}

main().catch(console.error);
