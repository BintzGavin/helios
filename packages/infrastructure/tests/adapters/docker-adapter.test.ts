import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DockerAdapter } from '../../src/adapters/docker-adapter.js';
import * as childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process');

describe('DockerAdapter', () => {
  let mockSpawn: any;
  let mockChildProcess: any;

  beforeEach(() => {
    mockChildProcess = new EventEmitter() as any;
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();

    mockSpawn = vi.spyOn(childProcess, 'spawn').mockReturnValue(mockChildProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should format docker run arguments correctly', async () => {
    const adapter = new DockerAdapter({ image: 'my-image', dockerArgs: ['--network', 'host'] });
    const jobPromise = adapter.execute({
      command: 'node',
      args: ['script.js'],
      env: { FOO: 'bar' }
    });

    // Simulate process completion
    setTimeout(() => {
      mockChildProcess.emit('close', 0);
    }, 10);

    await jobPromise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'docker',
      expect.arrayContaining([
        'run', '--name', expect.any(String), '--rm',
        '-e', 'FOO=bar',
        '--network', 'host',
        'my-image',
        'node', 'script.js'
      ]),
      expect.any(Object)
    );
  });

  it('should capture stdout and stderr', async () => {
    const adapter = new DockerAdapter({ image: 'test' });
    const jobPromise = adapter.execute({ command: 'test' });

    mockChildProcess.stdout.emit('data', Buffer.from('hello out'));
    mockChildProcess.stderr.emit('data', Buffer.from('hello err'));
    mockChildProcess.emit('close', 0);

    const result = await jobPromise;
    expect(result.stdout).toBe('hello out');
    expect(result.stderr).toBe('hello err');
    expect(result.exitCode).toBe(0);
  });

  it('should handle abort signal by removing container', async () => {
    const adapter = new DockerAdapter({ image: 'test' });
    const controller = new AbortController();
    const jobPromise = adapter.execute({ command: 'test', signal: controller.signal });

    controller.abort();

    // Simulate process closing after abort
    mockChildProcess.emit('close', 1);

    await jobPromise;

    expect(mockSpawn).toHaveBeenCalledWith('docker', ['rm', '-f', expect.any(String)], { stdio: 'ignore' });
  });

  it('should reject on process error', async () => {
     const adapter = new DockerAdapter({ image: 'test' });
     const jobPromise = adapter.execute({ command: 'test' });

     mockChildProcess.emit('error', new Error('spawn failed'));

     await expect(jobPromise).rejects.toThrow('spawn failed');
  });
});
