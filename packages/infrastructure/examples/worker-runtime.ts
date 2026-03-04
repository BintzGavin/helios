import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { WorkerRuntime, LocalStorageAdapter, JobSpec } from '../src/index.js';

async function runExample() {
  console.log('--- WorkerRuntime Standalone Example ---');

  // 1. Create a temporary workspace directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'helios-worker-runtime-example-'));
  console.log(`Created temporary workspace at: ${tempDir}`);

  try {
    // 2. Initialize LocalStorageAdapter referencing the temporary storage directory
    // We'll use a 'storage' subdirectory to simulate remote artifact storage
    const storageDir = path.join(tempDir, 'storage');
    await fs.mkdir(storageDir, { recursive: true });
    const storage = new LocalStorageAdapter(storageDir);
    console.log(`Initialized LocalStorageAdapter at: ${storageDir}`);

    // 3. Write a mock job.json to the workspace directory to simulate a downloaded job specification
    const jobSpec: JobSpec = {
      id: 'example-job-123',
      templateId: 'example-template',
      composition: {
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: 60,
      },
      chunks: [
        {
          id: 0,
          startFrame: 0,
          endFrame: 29,
          jobId: 'example-job-123',
          status: 'pending',
          command: 'echo "Rendering frames 0-29"'
        },
        {
          id: 1,
          startFrame: 30,
          endFrame: 59,
          jobId: 'example-job-123',
          status: 'pending',
          command: 'echo "Rendering frames 30-59"'
        }
      ],
      // Let's omit assetsUrl for a simple example to avoid needing to mock asset bundles,
      // as the goal is to demonstrate WorkerRuntime executing a chunk.
    };

    const jobPath = path.join(tempDir, 'job.json');
    await fs.writeFile(jobPath, JSON.stringify(jobSpec, null, 2), 'utf-8');
    console.log(`Wrote mock job.json to: ${jobPath}`);

    // Create an output directory for RenderExecutor
    const outputDir = path.join(tempDir, 'chunks');
    await fs.mkdir(outputDir, { recursive: true });

    // 4. Initialize WorkerRuntime using the storage adapter
    const runtime = new WorkerRuntime({
      workspaceDir: tempDir,
      storage: storage,
    });
    console.log('Initialized WorkerRuntime');

    // 5. Call WorkerRuntime.run passing the local job URL and a chunk ID
    const chunkIdToRun = 0;
    console.log(`Executing chunk ${chunkIdToRun}...`);

    // We are passing the absolute file path directly to run()
    // WorkerRuntime supports local file paths, http:// and https:// URLs.
    const result = await runtime.run(jobPath, chunkIdToRun);

    // 6. Log the execution results
    console.log('\n--- Execution Result ---');
    console.log(`Exit Code: ${result.exitCode}`);
    console.log(`Error (if any): ${result.error || 'None'}`);
    console.log(`Stdout: ${result.stdout}`);
    console.log(`Stderr: ${result.stderr}`);

    if (result.exitCode === 0) {
        console.log('\n✅ WorkerRuntime executed successfully!');
    } else {
        console.log('\n❌ WorkerRuntime execution failed!');
    }

  } catch (error) {
    console.error('An error occurred during execution:', error);
  } finally {
    // 7. Clean up the temporary directory securely
    console.log(`\nCleaning up temporary workspace at: ${tempDir}`);
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log('Cleanup complete.');
  }
}

// Execute the example
runExample().catch(console.error);
