import {
  LocalWorkerAdapter,
  JobExecutor,
  JobSpec,
} from '../src/index.js';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('--- Standalone JobExecutor Example ---');

  const baseDir = path.join(__dirname, '.job-executor-standalone');
  console.log(`Using Execution Directory: ${baseDir}`);

  // 1. Initialize Adapters & Stitcher
  // For this example, we use the LocalWorkerAdapter to execute chunks locally.
  const workerAdapter = new LocalWorkerAdapter();

  // 2. Initialize the JobExecutor
  // We pass the worker adapter to the executor. It will use this adapter to run each chunk.
  const executor = new JobExecutor(workerAdapter);

  // 3. Create a mock JobSpec
  // This simulates a distributed rendering job that has been split into 3 chunks.
  const mockJobSpec: JobSpec = {
    id: randomUUID(),
    metadata: {
      totalFrames: 30,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 1.0,
    },
    chunks: [
      {
        id: 0,
        startFrame: 0,
        frameCount: 10,
        outputFile: 'chunk-0.mp4',
        // Mock command: simply echoes a success message.
        // In a real scenario, this would invoke the renderer CLI.
        command: 'echo "mock render chunk 0"',
      },
      {
        id: 1,
        startFrame: 10,
        frameCount: 10,
        outputFile: 'chunk-1.mp4',
        command: 'echo "mock render chunk 1"',
      },
      {
        id: 2,
        startFrame: 20,
        frameCount: 10,
        outputFile: 'chunk-2.mp4',
        command: 'echo "mock render chunk 2"',
      },
    ],
    // The mergeCommand is used if no dedicated stitcher is provided.
    mergeCommand: 'echo "mock merge via mergeCommand"',
  };

  try {
    console.log(`Executing Job ID: ${mockJobSpec.id}...`);

    // 4. Create dummy chunk files
    // Since our mock commands only echo text, the actual output files won't be created.
    // The FfmpegStitcher will look for these files during the merge step, so we need to create them.
    const fs = await import('fs/promises');
    await fs.mkdir(baseDir, { recursive: true });

    // We create the base directory, but we don't need to create empty chunk files since we are
    // relying on the fallback mergeCommand instead of actual FFmpeg stitching for this example.

    // 5. Execute the Job
    // We invoke executor.execute() and pass our JobSpec and options.
    await executor.execute(mockJobSpec, {
      jobDir: baseDir,
      concurrency: 2, // Process up to 2 chunks concurrently
      merge: true,    // Enable the merge step after all chunks finish
      // By omitting 'stitcher' and 'outputFile', the executor falls back to executing 'mockJobSpec.mergeCommand'
      // stitcher: stitcher,
      // outputFile: 'final-output.mp4',
      onProgress: (completed, total) => {
        console.log(`[Progress] ${completed}/${total} chunks completed (${Math.round((completed / total) * 100)}%)`);
      },
      onChunkStdout: (chunkId, data) => {
        // Log output from individual chunks
        process.stdout.write(`[Chunk ${chunkId} stdout]: ${data}`);
      }
    });

    console.log('Execution completed successfully!');
    console.log('Final output is ready.');

    // Clean up
    console.log('Cleaning up execution directory...');
    await fs.rm(baseDir, { recursive: true, force: true });

    console.log('Example complete.');
  } catch (error) {
    console.error('Error executing example:', error);
    process.exit(1);
  }
}

main().catch(console.error);
