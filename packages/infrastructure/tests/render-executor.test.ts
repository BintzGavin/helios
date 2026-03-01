
import { describe, it, expect } from 'vitest';
import { RenderExecutor } from '../src/worker/render-executor.js';
import { JobSpec } from '../src/types/job-spec.js';
import { parseCommand } from '../src/utils/command.js';

describe('RenderExecutor', () => {
  const executor = new RenderExecutor('/tmp');

  const jobSpec: JobSpec = {
    id: 'test-job',
    metadata: {
      totalFrames: 10,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 1,
    },
    chunks: [
      {
        id: 1,
        startFrame: 0,
        frameCount: 5,
        outputFile: 'out1.mp4',
        // Simple command without quotes to avoid parsing issues in simple parser
        command: 'echo chunk1'
      },
      {
        id: 2,
        startFrame: 5,
        frameCount: 5,
        outputFile: 'out2.mp4',
        // Using a command that will definitely fail
        command: 'node -e process.exit(1)'
      }
    ],
    mergeCommand: 'echo merge'
  };

  it('should execute a successful command', async () => {
    const result = await executor.executeChunk(jobSpec, 1);
    expect(result.exitCode).toBe(0);
    // echo output ends with newline
    expect(result.stdout.trim()).toBe('chunk1');
  });

  it('should capture exit code from failing command', async () => {
    const result = await executor.executeChunk(jobSpec, 2);
    expect(result.exitCode).toBe(1);
  });

  it('should throw if chunk ID not found', async () => {
    await expect(executor.executeChunk(jobSpec, 999)).rejects.toThrow(/Chunk with ID 999 not found/);
  });
});
