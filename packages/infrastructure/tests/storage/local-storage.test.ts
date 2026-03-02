import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { LocalStorageAdapter } from '../../src/storage/local-storage.js';

describe('LocalStorageAdapter', () => {
  let tempDir: string;
  let localDir: string;
  let storageDir: string;
  let targetDir: string;
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    // Create temporary directories for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'helios-storage-test-'));
    localDir = path.join(tempDir, 'local');
    storageDir = path.join(tempDir, 'storage');
    targetDir = path.join(tempDir, 'target');

    await fs.mkdir(localDir, { recursive: true });
    await fs.mkdir(storageDir, { recursive: true });

    adapter = new LocalStorageAdapter({ storageDir });
  });

  afterEach(async () => {
    // Clean up temporary directories
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should upload an asset bundle and return a local:// URL', async () => {
    const jobId = 'job-123';
    await fs.writeFile(path.join(localDir, 'test.txt'), 'hello world');

    const remoteUrl = await adapter.uploadAssetBundle(jobId, localDir);

    expect(remoteUrl).toMatch(/^local:\/\//);
    const remoteDir = remoteUrl.slice('local://'.length);
    expect(remoteDir).toBe(path.join(storageDir, jobId));

    // Verify file was copied
    const content = await fs.readFile(path.join(remoteDir, 'test.txt'), 'utf-8');
    expect(content).toBe('hello world');
  });

  it('should upload an empty asset bundle', async () => {
    const jobId = 'job-123';

    const remoteUrl = await adapter.uploadAssetBundle(jobId, localDir);

    expect(remoteUrl).toMatch(/^local:\/\//);
    const remoteDir = remoteUrl.slice('local://'.length);

    // Verify directory exists and is empty
    const files = await fs.readdir(remoteDir);
    expect(files).toHaveLength(0);
  });

  it('should throw an error if the local directory does not exist on upload', async () => {
    const jobId = 'job-123';
    const nonExistentDir = path.join(tempDir, 'does-not-exist');

    await expect(adapter.uploadAssetBundle(jobId, nonExistentDir)).rejects.toThrow(/does not exist/);
  });

  it('should download an asset bundle from a local:// URL', async () => {
    const jobId = 'job-123';
    const remoteDir = path.join(storageDir, jobId);
    await fs.mkdir(remoteDir, { recursive: true });
    await fs.writeFile(path.join(remoteDir, 'test.txt'), 'download me');

    const remoteUrl = `local://${remoteDir}`;

    await adapter.downloadAssetBundle(jobId, remoteUrl, targetDir);

    // Verify file was copied
    const content = await fs.readFile(path.join(targetDir, 'test.txt'), 'utf-8');
    expect(content).toBe('download me');
  });

  it('should handle round-trip upload and download', async () => {
    const jobId = 'job-123';
    // Add multiple files and a subdirectory
    await fs.writeFile(path.join(localDir, 'file1.txt'), 'content 1');
    await fs.mkdir(path.join(localDir, 'subdir'));
    await fs.writeFile(path.join(localDir, 'subdir', 'file2.txt'), 'content 2');

    // Upload
    const remoteUrl = await adapter.uploadAssetBundle(jobId, localDir);

    // Download to a new target
    await adapter.downloadAssetBundle(jobId, remoteUrl, targetDir);

    // Verify files
    expect(await fs.readFile(path.join(targetDir, 'file1.txt'), 'utf-8')).toBe('content 1');
    expect(await fs.readFile(path.join(targetDir, 'subdir', 'file2.txt'), 'utf-8')).toBe('content 2');
  });

  it('should throw an error for unsupported remote URLs on download', async () => {
    const jobId = 'job-123';
    const remoteUrl = 's3://my-bucket/job-123';

    await expect(adapter.downloadAssetBundle(jobId, remoteUrl, targetDir)).rejects.toThrow(/Unsupported remote URL scheme/);
  });

  it('should throw an error if the remote directory does not exist on download', async () => {
    const jobId = 'job-123';
    const nonExistentDir = path.join(storageDir, 'does-not-exist');
    const remoteUrl = `local://${nonExistentDir}`;

    await expect(adapter.downloadAssetBundle(jobId, remoteUrl, targetDir)).rejects.toThrow(/does not exist/);
  });

  it('should delete an asset bundle', async () => {
    const jobId = 'job-123';
    await fs.writeFile(path.join(localDir, 'test.txt'), 'hello world');

    const remoteUrl = await adapter.uploadAssetBundle(jobId, localDir);
    const remoteDir = remoteUrl.slice('local://'.length);

    // Ensure it exists
    await fs.access(remoteDir);

    await adapter.deleteAssetBundle(jobId, remoteUrl);

    // Verify it is deleted
    await expect(fs.access(remoteDir)).rejects.toThrow(/ENOENT/);
  });

  it('should throw an error for unsupported remote URLs on delete', async () => {
    const jobId = 'job-123';
    const remoteUrl = 's3://my-bucket/job-123';

    await expect(adapter.deleteAssetBundle(jobId, remoteUrl)).rejects.toThrow(/Unsupported remote URL scheme/);
  });

  it('should prevent directory traversal attacks on delete', async () => {
    const jobId = 'job-123';
    const traversalPath = path.join(storageDir, '../../some-dir');
    const remoteUrl = `local://${traversalPath}`;

    await expect(adapter.deleteAssetBundle(jobId, remoteUrl)).rejects.toThrow(/Path traversal detected/);
  });
});
