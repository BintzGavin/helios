import { describe, bench, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RenderExecutor } from '../../src/worker/render-executor.js';
import { JobSpec } from '../../src/types/job-spec.js';

const workspaceDir = path.join(process.cwd(), '.tmp', 'render-executor-bench');

describe('RenderExecutor Benchmarks', () => {
  let renderExecutor: RenderExecutor;

  const mockJobSpec: JobSpec = {
    id: 'bench-job-id',
    metadata: {
      totalFrames: 10,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 1,
    },
    chunks: [
      {
        id: 0,
        startFrame: 0,
        frameCount: 10,
        outputFile: 'chunk-0.mp4',
        // Fast command for benchmarking spawn overhead
        command: 'node -e "process.exit(0)"'
      }
    ],
    mergeCommand: 'ffmpeg -i inputs -c copy out.mp4'
  };

  beforeAll(async () => {
    // Heavy setup: Create workspace directory
    await fs.mkdir(workspaceDir, { recursive: true });
    renderExecutor = new RenderExecutor(workspaceDir);
  });

  afterAll(async () => {
    // Heavy teardown: Remove workspace directory
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  bench('executeChunk overhead (fast process)', async () => {
    await renderExecutor.executeChunk(mockJobSpec, 0);
  });
});
