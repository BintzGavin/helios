import { describe, bench, beforeAll, afterAll, vi } from 'vitest';
import { DockerAdapter } from '../../src/adapters/docker-adapter.js';
import * as childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';

describe('DockerAdapter Benchmark', () => {
  const adapter = new DockerAdapter({ image: 'alpine:latest' });

  beforeAll(() => {
    vi.spyOn(childProcess, 'spawn').mockImplementation(() => {
      const mockProcess: any = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      setTimeout(() => mockProcess.emit('close', 0), 0);
      return mockProcess;
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  bench('execute formatting and spawn', async () => {
    if (vi.isMockFunction(childProcess.spawn)) {
      vi.mocked(childProcess.spawn).mockClear();
    }

    await adapter.execute({
      command: 'echo',
      args: ['hello'],
      env: { TEST: '1' }
    });
  });
});
