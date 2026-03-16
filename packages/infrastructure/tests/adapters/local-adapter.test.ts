import { describe, it, expect, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { LocalWorkerAdapter } from '../../src/adapters/index.js';
import { WorkerJob } from '../../src/types/index.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: vi.fn(actual.spawn),
  };
});

describe('LocalWorkerAdapter', () => {
  const adapter = new LocalWorkerAdapter();
  const nodePath = process.execPath;

  it('should successfully execute a simple command', async () => {
    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'console.log("hello")'],
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
    expect(result.stderr).toBe('');
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('should handle environment variables', async () => {
    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'console.log(process.env.TEST_VAR)'],
      env: { TEST_VAR: 'test_value' },
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('test_value');
  });

  it('should handle command failure (non-zero exit code)', async () => {
    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'process.exit(1)'],
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(1);
  });

  it('should handle non-existent commands', async () => {
    const job: WorkerJob = {
      command: 'non_existent_command_12345',
    };

    await expect(adapter.execute(job)).rejects.toThrow();
  });

  it('should handle timeouts', async () => {
    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'setTimeout(() => {}, 2000)'], // Sleep for 2 seconds
      timeout: 100, // Timeout after 100ms
    };

    await expect(adapter.execute(job)).rejects.toThrow(/timed out/);
  });

  it('should handle explicit cancellation via AbortSignal', async () => {
    const controller = new AbortController();
    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'setTimeout(() => {}, 5000)'], // Sleep for 5 seconds
      signal: controller.signal,
    };

    const promise = adapter.execute(job);

    // Give process a bit of time to start, then abort
    setTimeout(() => {
      controller.abort();
    }, 50);

    await expect(promise).rejects.toThrow('Job was aborted');
  });

  it('should handle explicit cancellation via AbortSignal with timeout', async () => {
    const controller = new AbortController();
    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'setTimeout(() => {}, 5000)'], // Sleep for 5 seconds
      signal: controller.signal,
      timeout: 10000,
    };

    const promise = adapter.execute(job);

    // Give process a bit of time to start, then abort
    setTimeout(() => {
      controller.abort();
    }, 50);

    await expect(promise).rejects.toThrow('Job was aborted');
  });

  it('should fail fast if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'setTimeout(() => {}, 2000)'],
      signal: controller.signal,
    };

    await expect(adapter.execute(job)).rejects.toThrow('Job was aborted');
  });

  it('should trigger onStdout and onStderr callbacks during execution', async () => {
    let stdoutData = '';
    let stderrData = '';

    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'console.log("stdout message"); console.error("stderr message");'],
      onStdout: (data) => {
        stdoutData += data;
      },
      onStderr: (data) => {
        stderrData += data;
      },
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(stdoutData).toContain('stdout message');
    expect(stderrData).toContain('stderr message');
    // Ensure buffered output is also correct
    expect(result.stdout).toContain('stdout message');
    expect(result.stderr).toContain('stderr message');
  });

  it('should accumulate stderr even without onStderr callback', async () => {
    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'console.error("test stderr accumulation");'],
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('test stderr accumulation');
  });

  it('should handle stderr if not provided', async () => {
    const job: WorkerJob = {
      command: nodePath,
      args: ['-e', 'process.stderr.write("test stderr");'],
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('test stderr');
  });

  it('should clear timeout when aborted to prevent process hanging', async () => {
    const controller = new AbortController();

    const promise = adapter.execute({
      command: nodePath,
      args: ['-e', 'setTimeout(() => {}, 5000)'],
      signal: controller.signal,
      timeout: 10000,
    });

    controller.abort();

    await expect(promise).rejects.toThrow('Job was aborted');
  });

  it('should gracefully handle missing child.stderr stream', async () => {
    const mockChild = new EventEmitter() as any;
    mockChild.kill = () => {};
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = undefined; // Specifically test undefined stderr

    vi.mocked(spawn).mockImplementationOnce(() => {
      setTimeout(() => mockChild.emit('close', 0), 10);
      return mockChild;
    });

    const job: WorkerJob = {
      command: 'mock-command',
      args: [],
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    // Cleanup is automatic with mockImplementationOnce,
    // but just to be sure we can clear mocks
    vi.clearAllMocks();
  });
});
