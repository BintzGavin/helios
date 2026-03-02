import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadJobSpec, registerJobCommand } from '../job';
import path from 'path';
import fs from 'fs';
import { Command } from 'commander';
import { JobExecutor, LocalWorkerAdapter, AwsLambdaAdapter, CloudRunAdapter } from '@helios-project/infrastructure';

vi.mock('@helios-project/infrastructure', () => {
  return {
    JobExecutor: vi.fn().mockImplementation(() => ({
      execute: vi.fn().mockResolvedValue(undefined)
    })),
    LocalWorkerAdapter: vi.fn(),
    AwsLambdaAdapter: vi.fn(),
    CloudRunAdapter: vi.fn(),
  };
});

// Mock fs module
vi.mock('fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
    // Also mock named exports just in case, though job.ts uses default
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

// Mock fetch global
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('loadJobSpec', () => {
  const mockCwd = '/test/cwd';

  beforeEach(() => {
    vi.resetAllMocks();
    // Spy on process.cwd
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Remote URLs', () => {
    it('should fetch and parse JSON from a valid URL', async () => {
      const mockJobSpec = { chunks: [] };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockJobSpec,
      });

      const url = 'http://example.com/job.json';
      const result = await loadJobSpec(url);

      expect(fetchMock).toHaveBeenCalledWith(url);
      expect(result.jobSpec).toEqual(mockJobSpec);
      expect(result.jobDir).toBe(mockCwd);
    });

    it('should throw an error if fetch fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const url = 'http://example.com/job.json';
      await expect(loadJobSpec(url)).rejects.toThrow('Failed to fetch job: Not Found (404)');
    });
  });

  describe('Command Registration', () => {
    let program: Command;
    let mockExit: any;
    let mockConsoleError: any;

    beforeEach(() => {
      program = new Command();
      registerJobCommand(program);
      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockJobSpec = { chunks: [] };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockJobSpec));
    });

    afterEach(() => {
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should default to LocalWorkerAdapter', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json']);
      expect(LocalWorkerAdapter).toHaveBeenCalled();
      expect(JobExecutor).toHaveBeenCalled();
    });

    it('should instantiate AwsLambdaAdapter when --adapter aws is used', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'aws', '--aws-function-name', 'my-func']);
      expect(AwsLambdaAdapter).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'my-func'
      }));
    });

    it('should error if aws adapter is used without function name', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'aws']);
      expect(mockConsoleError).toHaveBeenCalledWith('Job execution failed:', 'AWS adapter requires --aws-function-name');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should instantiate CloudRunAdapter when --adapter gcp is used', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'gcp', '--gcp-service-url', 'http://gcp.com']);
      expect(CloudRunAdapter).toHaveBeenCalledWith(expect.objectContaining({
        serviceUrl: 'http://gcp.com'
      }));
    });

    it('should error if gcp adapter is used without service url', async () => {
      await program.parseAsync(['node', 'test', 'job', 'run', 'job.json', '--adapter', 'gcp']);
      expect(mockConsoleError).toHaveBeenCalledWith('Job execution failed:', 'GCP adapter requires --gcp-service-url');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Local Files', () => {
    it('should read and parse JSON from a valid local file', async () => {
      const mockJobSpec = { chunks: [] };
      const filename = 'job.json';
      const absolutePath = path.resolve(mockCwd, filename);

      // Setup fs mocks
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockJobSpec));

      const result = await loadJobSpec(filename);

      expect(fs.existsSync).toHaveBeenCalledWith(absolutePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(absolutePath, 'utf-8');
      expect(result.jobSpec).toEqual(mockJobSpec);
      expect(result.jobDir).toBe(path.dirname(absolutePath));
    });

    it('should throw an error if local file does not exist', async () => {
      const filename = 'job.json';
      const absolutePath = path.resolve(mockCwd, filename);

      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(loadJobSpec(filename)).rejects.toThrow(`Job file not found: ${absolutePath}`);
    });
  });
});
