import { describe, bench, beforeAll, afterAll } from 'vitest';
import { FfmpegStitcher } from '../../src/stitcher/ffmpeg-stitcher.js';
import { WorkerAdapter, WorkerJob, WorkerResult } from '../../src/types/index.js';
import { writeFile, unlink, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock WorkerAdapter that resolves immediately to isolate Node.js overhead
class MockWorkerAdapter implements WorkerAdapter {
  async execute(job: WorkerJob): Promise<WorkerResult> {
    return { exitCode: 0, stdout: '', stderr: '', durationMs: 1 };
  }
}

describe('FfmpegStitcher Benchmark', () => {
  const tempDir = join(tmpdir(), `ffmpeg-stitcher-bench-${Date.now()}`);
  let stitcher: FfmpegStitcher;

  const createDummyFiles = async (count: number): Promise<string[]> => {
    const files: string[] = [];
    for (let i = 0; i < count; i++) {
      const file = join(tempDir, `part${i}.mp4`);
      await writeFile(file, 'dummy content');
      files.push(file);
    }
    return files;
  };

  let segments2: string[] = [];
  let segments10: string[] = [];
  let segments100: string[] = [];

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true });

    // Create dummy files for different segment sizes
    segments2 = await createDummyFiles(2);
    segments10 = await createDummyFiles(10);
    segments100 = await createDummyFiles(100);

    const adapter = new MockWorkerAdapter();
    stitcher = new FfmpegStitcher(adapter);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  bench('Stitch 2 segments', async () => {
    await stitcher.stitch(segments2, join(tempDir, 'output2.mp4'));
  });

  bench('Stitch 10 segments', async () => {
    await stitcher.stitch(segments10, join(tempDir, 'output10.mp4'));
  });

  bench('Stitch 100 segments', async () => {
    await stitcher.stitch(segments100, join(tempDir, 'output100.mp4'));
  });
});
