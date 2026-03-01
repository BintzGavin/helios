import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerRuntime } from '../src/worker/runtime.js';
import { JobSpec } from '../src/types/job-spec.js';
import { RenderExecutor } from '../src/worker/render-executor.js';

// Mock fs.promises.readFile
const readFileMock = vi.fn();
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: (...args: any[]) => readFileMock(...args),
  },
}));

// Mock RenderExecutor
// Use a standard function (not an arrow function) so it can be called with `new`
const executeChunkMock = vi.fn().mockResolvedValue({
  exitCode: 0,
  stdout: 'Success',
  stderr: '',
  durationMs: 100,
});

vi.mock('../src/worker/render-executor.js', () => {
  return {
    RenderExecutor: function(workspaceDir: string) {
      return {
        executeChunk: executeChunkMock,
      };
    },
  };
});

describe('WorkerRuntime', () => {
  let runtime: WorkerRuntime;
  const mockWorkspaceDir = '/tmp/workspace';
  const mockJobSpec: JobSpec = {
    id: 'job-123',
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
        frameCount: 5,
        outputFile: 'out_0.mp4',
        command: 'render --chunk 0',
      },
    ],
    mergeCommand: 'merge',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = new WorkerRuntime({ workspaceDir: mockWorkspaceDir });
    global.fetch = vi.fn();
  });

  it('should fetch JobSpec from URL and execute chunk', async () => {
    const jobUrl = 'http://example.com/job.json';
    const chunkId = 0;

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockJobSpec,
    });

    const result = await runtime.run(jobUrl, chunkId);

    expect(global.fetch).toHaveBeenCalledWith(jobUrl);
    // Use the spy on the class constructor if possible, but here we can just check execution
    expect(executeChunkMock).toHaveBeenCalledWith(mockJobSpec, chunkId);
    expect(result.exitCode).toBe(0);
  });

  it('should read JobSpec from local file and execute chunk', async () => {
    const jobPath = '/local/job.json';
    const chunkId = 0;

    readFileMock.mockResolvedValue(JSON.stringify(mockJobSpec));

    const result = await runtime.run(jobPath, chunkId);

    expect(readFileMock).toHaveBeenCalledWith(jobPath, 'utf-8');
    expect(executeChunkMock).toHaveBeenCalledWith(mockJobSpec, chunkId);
    expect(result.exitCode).toBe(0);
  });

  it('should download asset bundle if assetsUrl and storage are provided', async () => {
    const jobUrl = 'http://example.com/job.json';
    const chunkId = 0;

    const mockStorage = {
      downloadAssetBundle: vi.fn().mockResolvedValue(undefined),
      uploadAssetBundle: vi.fn(),
    };

    const runtimeWithStorage = new WorkerRuntime({ workspaceDir: mockWorkspaceDir, storage: mockStorage });

    const jobSpecWithAssets = { ...mockJobSpec, assetsUrl: 's3://some/url' };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => jobSpecWithAssets,
    });

    await runtimeWithStorage.run(jobUrl, chunkId);

    expect(mockStorage.downloadAssetBundle).toHaveBeenCalledWith('job-123', 's3://some/url', mockWorkspaceDir);
    expect(executeChunkMock).toHaveBeenCalledWith(jobSpecWithAssets, chunkId);
  });

  it('should throw error if fetch fails', async () => {
    const jobUrl = 'http://example.com/job.json';
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(runtime.run(jobUrl, 0)).rejects.toThrow('Failed to fetch job spec: Not Found');
  });

  it('should throw error if file read fails', async () => {
    const jobPath = '/local/job.json';
    readFileMock.mockRejectedValue(new Error('File not found'));

    await expect(runtime.run(jobPath, 0)).rejects.toThrow('File not found');
  });

  it('should throw error if JobSpec is invalid (missing chunks)', async () => {
    const jobPath = '/local/job.json';
    readFileMock.mockResolvedValue(JSON.stringify({})); // Empty object

    await expect(runtime.run(jobPath, 0)).rejects.toThrow('Invalid JobSpec: missing chunks array');
  });
});
