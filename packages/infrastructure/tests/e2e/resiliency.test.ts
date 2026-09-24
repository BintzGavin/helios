import { describe, it, expect, vi } from 'vitest';
import { LocalWorkerAdapter } from '../../src/adapters/local-adapter.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';
import { RenderExecutor } from '../../src/worker/render-executor.js';
import { FfmpegStitcher } from '../../src/stitcher/ffmpeg-stitcher.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { ArtifactStorage } from '../../src/types/index.js';
import * as fs from 'node:fs';

describe('Infrastructure Resiliency and Regression Tests', () => {
  describe('FfmpegStitcher Resiliency', () => {
    it('should fail gracefully when no input files are provided', async () => {
      const adapter = new LocalWorkerAdapter();
      const stitcher = new FfmpegStitcher(adapter);

      await expect(stitcher.stitch([], 'output.mp4')).rejects.toThrow('No input files provided for stitching');
    });

    it('should handle ffmpeg command execution failure and throw error with stderr', async () => {
      const adapter = new LocalWorkerAdapter();
      vi.spyOn(adapter, 'execute').mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Simulated ffmpeg error output',
        durationMs: 15
      });

      const stitcher = new FfmpegStitcher(adapter);

      await expect(stitcher.stitch(['input1.mp4', 'input2.mp4'], 'output.mp4'))
        .rejects.toThrow('FFmpeg stitching failed with exit code 1: Simulated ffmpeg error output');
    });

    it('should clean up the temporary list file even if ffmpeg command fails', async () => {
      const adapter = new LocalWorkerAdapter();
      vi.spyOn(adapter, 'execute').mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Simulated ffmpeg error output',
        durationMs: 15
      });

      // To avoid global ESM mock issues with fs/promises, we allow the temporary
      // file to be written to the real OS temp directory.
      // We then intercept the execution call to capture the generated path,
      // simulate an ffmpeg failure, and verify the file is successfully unlinked
      // in the finally block.

      let capturedListPath = '';
      vi.spyOn(adapter, 'execute').mockImplementation(async (job) => {
        const iIndex = job.args?.indexOf('-i');
        if (iIndex !== undefined && iIndex !== -1 && job.args) {
            capturedListPath = job.args[iIndex + 1];
        }
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'Simulated ffmpeg error output',
          durationMs: 15
        };
      });

      const stitcher = new FfmpegStitcher(adapter);

      await expect(stitcher.stitch(['input1.mp4', 'input2.mp4'], 'output.mp4')).rejects.toThrow();

      expect(capturedListPath).toBeTruthy();

      // Check if the file still exists
      const fileExists = fs.existsSync(capturedListPath);
      expect(fileExists).toBe(false);
    });
  });

  describe('WorkerRuntime Resiliency', () => {
    it('WorkerRuntime should propagate storage fetch errors gracefully', async () => {
      const failingStorage: ArtifactStorage = {
        downloadAssetBundle: vi.fn().mockRejectedValue(new Error('Simulated storage fetch error')),
        uploadAssetBundle: vi.fn(),
      };

      const runtime = new WorkerRuntime({
        workspaceDir: '/tmp/test-workspace',
        storage: failingStorage
      });

      const mockJobSpec: JobSpec = {
        id: 'job-123',
        assetsUrl: 's3://some/path',
        chunks: [
          { id: 1, command: 'render', outputFile: 'out.mp4' }
        ]
      };

      // Mock fetch to return the spec
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockJobSpec
      });

      try {
        await expect(runtime.run('http://example.com/job.json', 1)).rejects.toThrow('Simulated storage fetch error');
        expect(failingStorage.downloadAssetBundle).toHaveBeenCalledWith('job-123', 's3://some/path', '/tmp/test-workspace');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('WorkerRuntime should correctly propagate chunk execution errors', async () => {
      const runtime = new WorkerRuntime({
        workspaceDir: '/tmp/test-workspace',
      });

      const mockJobSpec: JobSpec = {
        id: 'job-123',
        chunks: [
          { id: 1, command: 'render', outputFile: 'out.mp4' }
        ]
      };

      // Mock fetch to return the spec
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockJobSpec
      });

      // Use vi.spyOn on the prototype of RenderExecutor to mock the class method
      const executeChunkSpy = vi.spyOn(RenderExecutor.prototype, 'executeChunk').mockRejectedValue(new Error('Simulated chunk execution error'));

      try {
        await expect(runtime.run('http://example.com/job.json', 1)).rejects.toThrow('Simulated chunk execution error');
      } finally {
        global.fetch = originalFetch;
        executeChunkSpy.mockRestore();
      }
    });

    it('WorkerRuntime should gracefully handle remote JobSpec fetch failures', async () => {
      const runtime = new WorkerRuntime({
        workspaceDir: '/tmp/test-workspace',
      });

      // Mock fetch to return a non-ok response
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      });

      try {
        await expect(runtime.run('http://example.com/job.json', 1)).rejects.toThrow('Failed to fetch job spec: Not Found');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
