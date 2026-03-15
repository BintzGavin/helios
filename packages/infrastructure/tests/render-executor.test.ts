
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RenderExecutor } from '../src/worker/render-executor.js';
import { JobSpec } from '../src/types/job-spec.js';
import { parseCommand } from '../src/utils/command.js';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: vi.fn(),
  };
});
import { spawn } from 'node:child_process';

// Get the original spawn to use it for non-mocked tests
const originalChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');
const originalSpawn = originalChildProcess.spawn;

describe('RenderExecutor', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockImplementation(originalSpawn as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
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

  it('should handle process execution without stdout and stderr', async () => {
    vi.mocked(spawn).mockImplementation(((command: any, args: any, options: any) => {
      const child = new EventEmitter() as any;
      child.stdout = null;
      child.stderr = null;

      setTimeout(() => {
        child.emit('close', 0);
      }, 10);

      return child as import('node:child_process').ChildProcess;
    }) as any);

    const result = await executor.executeChunk(jobSpec, 1);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('should capture spawn errors properly', async () => {
    vi.mocked(spawn).mockImplementation(((command: any, args: any, options: any) => {
      const child = new EventEmitter() as any;
      child.stdout = null;
      child.stderr = null;

      setTimeout(() => {
        child.emit('error', new Error('Spawn error'));
      }, 10);

      return child as import('node:child_process').ChildProcess;
    }) as any);

    await expect(executor.executeChunk(jobSpec, 1)).rejects.toThrow('Spawn error');
  });

  it('should capture stdout data correctly when stream is present', async () => {
    vi.mocked(spawn).mockImplementation(((command: any, args: any, options: any) => {
      const child = new EventEmitter() as any;
      child.stdout = new EventEmitter();
      child.stderr = null;

      setTimeout(() => {
        child.stdout.emit('data', Buffer.from('stdout test'));
        child.emit('close', 0);
      }, 10);

      return child as import('node:child_process').ChildProcess;
    }) as any);

    const result = await executor.executeChunk(jobSpec, 1);
    expect(result.stdout).toBe('stdout test');
  });

  it('should capture stderr data correctly when stream is present', async () => {
    vi.mocked(spawn).mockImplementation(((command: any, args: any, options: any) => {
      const child = new EventEmitter() as any;
      child.stdout = null;
      child.stderr = new EventEmitter();

      setTimeout(() => {
        child.stderr.emit('data', Buffer.from('stderr test'));
        child.emit('close', 1);
      }, 10);

      return child as import('node:child_process').ChildProcess;
    }) as any);

    const result = await executor.executeChunk(jobSpec, 1);
    expect(result.stderr).toBe('stderr test');
  });
});
