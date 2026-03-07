import { RenderExecutor, JobSpec } from '../src/index.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

async function main() {
  console.log('--- RenderExecutor Example ---');
  const tmpDir = os.tmpdir();
  const outputDir = path.join(tmpDir, 'render-executor-example-workspace');

  await fs.mkdir(outputDir, { recursive: true });
  console.log(`Using temporary workspace directory: ${outputDir}`);

  const mockJobSpec: JobSpec = {
    id: 'mock-job-id',
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
        outputFile: path.join(outputDir, 'chunk-0.mp4'),
        command: 'node -e "console.log(\'Rendering frame...\')"'
      },
    ],
    mergeCommand: 'node -e "console.log(\'Merging...\')"'
  };

  const executor = new RenderExecutor(outputDir);

  try {
    console.log(`Executing chunk 0...`);
    const result = await executor.executeChunk(mockJobSpec, 0);

    console.log('Chunk execution completed.');
    console.log('WorkerResult:');
    console.log(`  Exit Code: ${result.exitCode}`);
    console.log(`  Stdout: ${result.stdout.trim()}`);
    console.log(`  Stderr: ${result.stderr.trim()}`);
    console.log(`  Duration: ${result.durationMs}ms`);

  } catch (error) {
    console.error('Error executing chunk:', error);
  } finally {
    console.log('Cleaning up temporary workspace directory...');
    await fs.rm(outputDir, { recursive: true, force: true });
    console.log('Example complete.');
  }
}

main().catch(console.error);
