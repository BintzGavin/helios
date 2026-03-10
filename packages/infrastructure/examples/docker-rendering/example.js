import { JobExecutor } from '../../dist/orchestrator/job-executor.js';
import { DockerAdapter } from '../../dist/adapters/docker-adapter.js';

async function main() {
  const adapter = new DockerAdapter({ image: 'alpine:latest' });

  const executor = new JobExecutor(adapter);

  const controller = new AbortController();

  console.log('Executing job on Docker...');

  await executor.execute({
    id: 'job-123',
    metadata: { totalFrames: 60, fps: 30, width: 1920, height: 1080, duration: 2 },
    chunks: [
      { id: 1, startFrame: 0, frameCount: 30, command: 'echo "Hello from Docker Chunk 1"', outputFile: 'out1.mp4' },
      { id: 2, startFrame: 30, frameCount: 30, command: 'echo "Hello from Docker Chunk 2"', outputFile: 'out2.mp4' }
    ],
    mergeCommand: 'echo "Merging!"'
  }, {
    signal: controller.signal,
    onChunkComplete: (chunkId, result) => {
       console.log(`Chunk ${chunkId} result:`, result.stdout);
    }
  });

  console.log('Execution completed.');
}

main().catch(console.error);
