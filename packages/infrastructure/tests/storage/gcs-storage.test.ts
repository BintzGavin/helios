import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';

const mockBucket = {
  upload: vi.fn(),
  getFiles: vi.fn(),
  deleteFiles: vi.fn(),
  file: vi.fn().mockReturnValue({ save: vi.fn(), delete: vi.fn() }),
};

vi.mock('@google-cloud/storage', () => {
  class Storage {
    bucket() {
      return mockBucket;
    }
  }
  return { Storage };
});

vi.mock('node:fs/promises', () => {
  return {
    default: {
      access: vi.fn(),
      mkdir: vi.fn(),
      readdir: vi.fn(),
    }
  };
});

import { GcsStorageAdapter } from '../../src/storage/gcs-storage.js';

describe('GcsStorageAdapter', () => {
  const jobId = 'test-job-123';
  const bucketName = 'my-test-bucket';
  const localDir = '/test/local/dir';
  const targetDir = '/test/target/dir';

  let adapter: GcsStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GcsStorageAdapter({ bucket: bucketName });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('uploadAssetBundle', () => {
    it('throws error if local directory does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

      await expect(adapter.uploadAssetBundle(jobId, localDir))
        .rejects
        .toThrow(`Local directory ${localDir} does not exist`);
    });

    it('uploads all files in the directory to GCS', async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      const file1 = path.join(localDir, 'file1.txt');
      const file2 = path.join(localDir, 'sub', 'file2.txt');

      vi.mocked(fs.readdir)
        .mockResolvedValueOnce([
          { name: 'file1.txt', isDirectory: () => false },
          { name: 'sub', isDirectory: () => true },
        ] as any)
        .mockResolvedValueOnce([
          { name: 'file2.txt', isDirectory: () => false },
        ] as any);

      const url = await adapter.uploadAssetBundle(jobId, localDir);

      expect(url).toBe(`gcs://${bucketName}/${jobId}`);
      expect(mockBucket.upload).toHaveBeenCalledTimes(2);

      expect(mockBucket.upload).toHaveBeenCalledWith(
        file1,
        { destination: `${jobId}/file1.txt` }
      );

      // Use path logic that works cross-platform for testing
      const expectedPath2 = `sub/file2.txt`.split('/').join('/');
      expect(mockBucket.upload).toHaveBeenCalledWith(
        file2,
        { destination: `${jobId}/${expectedPath2}` }
      );
    });
  });

  describe('downloadAssetBundle', () => {
    it('throws error for unsupported scheme', async () => {
      await expect(adapter.downloadAssetBundle(jobId, 's3://bucket/prefix', targetDir))
        .rejects
        .toThrow('Unsupported remote URL scheme: s3://bucket/prefix');
    });

    it('throws error if URL is invalid', async () => {
      await expect(adapter.downloadAssetBundle(jobId, 'gcs://', targetDir))
        .rejects
        .toThrow('Invalid GCS URL format: gcs://');
    });

    it('throws error if bucket name does not match adapter configuration', async () => {
      await expect(adapter.downloadAssetBundle(jobId, 'gcs://other-bucket/prefix', targetDir))
        .rejects
        .toThrow('Remote URL bucket other-bucket does not match adapter bucket my-test-bucket');
    });

    it('throws error if remote directory is empty or does not exist', async () => {
      mockBucket.getFiles.mockResolvedValueOnce([[]]);

      await expect(adapter.downloadAssetBundle(jobId, `gcs://${bucketName}/test-prefix`, targetDir))
        .rejects
        .toThrow(`Remote directory gcs://${bucketName}/test-prefix does not exist or is empty`);
    });

    it('downloads all files from GCS to local directory', async () => {
      const mockFile1 = { name: 'test-prefix/file1.txt', download: vi.fn().mockResolvedValue(undefined) };
      const mockFile2 = { name: 'test-prefix/sub/file2.txt', download: vi.fn().mockResolvedValue(undefined) };
      const mockDir = { name: 'test-prefix/', download: vi.fn().mockResolvedValue(undefined) };

      mockBucket.getFiles.mockResolvedValueOnce([[mockDir, mockFile1, mockFile2]]);

      await adapter.downloadAssetBundle(jobId, `gcs://${bucketName}/test-prefix`, targetDir);

      expect(mockBucket.getFiles).toHaveBeenCalledWith({ prefix: 'test-prefix/' });
      expect(fs.mkdir).toHaveBeenCalledTimes(2); // once for file1.txt's dir, once for sub/file2.txt's dir

      expect(mockFile1.download).toHaveBeenCalledWith({ destination: path.join(targetDir, 'file1.txt') });
      expect(mockFile2.download).toHaveBeenCalledWith({ destination: path.join(targetDir, 'sub', 'file2.txt') });
      expect(mockDir.download).not.toHaveBeenCalled();
    });
  });

  describe('deleteAssetBundle', () => {
    it('throws error for unsupported scheme', async () => {
      await expect(adapter.deleteAssetBundle(jobId, 's3://bucket/prefix'))
        .rejects
        .toThrow('Unsupported remote URL scheme: s3://bucket/prefix');
    });

    it('throws error if bucket name does not match adapter configuration', async () => {
      await expect(adapter.deleteAssetBundle(jobId, 'gcs://other-bucket/prefix'))
        .rejects
        .toThrow('Remote URL bucket other-bucket does not match adapter bucket my-test-bucket');
    });

    it('deletes all files matching the prefix', async () => {
      await adapter.deleteAssetBundle(jobId, `gcs://${bucketName}/test-prefix`);

      expect(mockBucket.deleteFiles).toHaveBeenCalledWith({ prefix: 'test-prefix/' });
    });
  });

  describe('uploadJobSpec', () => {
    it('should upload a job spec and return a gcs:// URL', async () => {
      const spec: any = { id: jobId, chunks: [] };
      const mockFile = {
        save: vi.fn().mockResolvedValue(undefined),
      };
      mockBucket.file.mockReturnValue(mockFile);

      const remoteUrl = await adapter.uploadJobSpec(jobId, spec);

      expect(remoteUrl).toBe(`gcs://${bucketName}/${jobId}/job.json`);
      expect(mockBucket.file).toHaveBeenCalledWith(`${jobId}/job.json`);
      expect(mockFile.save).toHaveBeenCalledWith(JSON.stringify(spec, null, 2), {
        contentType: 'application/json',
      });
    });
  });

  describe('deleteJobSpec', () => {
    it('should delete a job spec', async () => {
      const mockFile = {
        delete: vi.fn().mockResolvedValue(undefined),
      };
      mockBucket.file.mockReturnValue(mockFile);

      await adapter.deleteJobSpec(jobId, `gcs://${bucketName}/${jobId}/job.json`);

      expect(mockBucket.file).toHaveBeenCalledWith(`${jobId}/job.json`);
      expect(mockFile.delete).toHaveBeenCalled();
    });

    it('should throw an error for unsupported remote URLs on deleteJobSpec', async () => {
      await expect(adapter.deleteJobSpec(jobId, `local:///path/to/job.json`))
        .rejects
        .toThrow(/Unsupported remote URL scheme/);
    });

    it('should throw an error if mismatched bucket on deleteJobSpec', async () => {
      await expect(adapter.deleteJobSpec(jobId, `gcs://other-bucket/${jobId}/job.json`))
        .rejects
        .toThrow(/does not match adapter bucket/);
    });
  });
});
