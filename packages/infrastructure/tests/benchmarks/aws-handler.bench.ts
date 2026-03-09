import { describe, bench, beforeAll, vi } from 'vitest';
import { createAwsHandler } from '../../src/worker/aws-handler.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';

vi.mock('../../src/worker/runtime.js');

describe('AwsHandler Benchmark', () => {
  const handler = createAwsHandler({ workspaceDir: '/tmp' });
  const event = { jobPath: '/tmp/test.json', chunkIndex: 0 };

  beforeAll(() => {
    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 0,
      stdout: 'Mock output',
      stderr: '',
      durationMs: 10
    });
  });

  bench('handle event', async () => {
    await handler(event);
  });
});
