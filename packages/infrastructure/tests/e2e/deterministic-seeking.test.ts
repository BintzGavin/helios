import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { LocalWorkerAdapter } from '../../src/adapters/local-adapter.js';
import { JobSpec } from '../../src/types/job-spec.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

describe('E2E: Deterministic Seeking Verification', () => {
  const testDir = path.join(process.cwd(), 'tests', 'e2e', 'temp-deterministic');
  const tempDirA = path.join(testDir, 'runA');
  const tempDirB = path.join(testDir, 'runB');

  beforeAll(async () => {
    // Setup temporary directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(tempDirA, { recursive: true });
    await fs.mkdir(tempDirB, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup temporary directories
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const calculateHash = async (filePath: string): Promise<string> => {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  };

  it('should produce identical chunk outputs when rendered in isolation', async () => {
    const adapter = new LocalWorkerAdapter();
    const executor = new JobExecutor(adapter);

    // We simulate a deterministic render chunk.
    // In a real scenario, this would be `node render.js --chunk 50-60`.
    // We'll use a bash command that deterministically writes to a file based on inputs.
    // For Windows compatibility and Node context, we'll write a tiny inline Node script
    // that deterministically outputs a buffer to output.mp4 based on environment variables.

    const renderScript = `
      import fs from 'node:fs';
      import crypto from 'node:crypto';
      const start = process.env.CHUNK_START || '0';
      const end = process.env.CHUNK_END || '10';
      // Create a deterministic pseudo-random stream based on chunk bounds
      const hash = crypto.createHash('sha256').update(start + '-' + end).digest();
      const buffer = Buffer.alloc(1024); // 1KB mock chunk
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = hash[i % hash.length];
      }
      fs.writeFileSync('chunk_50_60.mp4', buffer);
    `;

    const scriptPath = path.join(testDir, 'mock-render.mjs');
    await fs.writeFile(scriptPath, renderScript);

    const spec: JobSpec = {
      id: 'deterministic-test-job',
      chunks: [
        {
          id: 1,
          // We use node to execute the script
          command: `node "${scriptPath}"`,
          outputFile: 'chunk_50_60.mp4',
        }
      ]
    };

    // Run A
    await executor.execute(spec, { jobDir: tempDirA, merge: false });
    const outputA = path.join(tempDirA, 'chunk_50_60.mp4');
    const hashA = await calculateHash(outputA);

    // Run B
    await executor.execute(spec, { jobDir: tempDirB, merge: false });
    const outputB = path.join(tempDirB, 'chunk_50_60.mp4');
    const hashB = await calculateHash(outputB);

    // Verify determinism
    expect(hashA).toEqual(hashB);

    // Verify file exists and is not empty
    const statsA = await fs.stat(outputA);
    expect(statsA.size).toBeGreaterThan(0);
  });
});
