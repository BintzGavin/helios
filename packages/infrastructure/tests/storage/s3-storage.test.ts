import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import { createReadStream, ReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { mockClient } from 'aws-sdk-client-mock';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { S3StorageAdapter } from '../../src/storage/s3-storage.js';

const s3Mock = mockClient(S3Client);

describe('S3StorageAdapter', () => {
  let tempDir: string;
  let localDir: string;
  let targetDir: string;
  let adapter: S3StorageAdapter;
  const bucket = 'my-test-bucket';
  const region = 'us-east-1';

  beforeEach(async () => {
    s3Mock.reset();

    // Create temporary directories for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'helios-s3-test-'));
    localDir = path.join(tempDir, 'local');
    targetDir = path.join(tempDir, 'target');

    await fs.mkdir(localDir, { recursive: true });

    adapter = new S3StorageAdapter({
      bucket,
      region,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
  });

  afterEach(async () => {
    // Clean up temporary directories
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should upload an asset bundle and return an s3:// URL', async () => {
    const jobId = 'job-123';
    await fs.writeFile(path.join(localDir, 'test.txt'), 'hello world');

    s3Mock.on(PutObjectCommand).resolves({});

    const remoteUrl = await adapter.uploadAssetBundle(jobId, localDir);

    expect(remoteUrl).toBe(`s3://${bucket}/${jobId}`);

    expect(s3Mock.calls().length).toBe(1);
    const putCall = s3Mock.call(0);
    expect(putCall.args[0].input).toMatchObject({
      Bucket: bucket,
      Key: `${jobId}/test.txt`,
    });
    // Stream verification could be tricky with mocks, but we know Body is provided
    expect(putCall.args[0].input.Body).toBeDefined();
  });

  it('should upload a bundle with subdirectories', async () => {
    const jobId = 'job-123';
    await fs.writeFile(path.join(localDir, 'file1.txt'), 'content 1');
    await fs.mkdir(path.join(localDir, 'subdir'));
    await fs.writeFile(path.join(localDir, 'subdir', 'file2.txt'), 'content 2');

    s3Mock.on(PutObjectCommand).resolves({});

    await adapter.uploadAssetBundle(jobId, localDir);

    expect(s3Mock.calls().length).toBe(2);

    const keys = s3Mock.calls().map(c => c.args[0].input.Key).sort();
    expect(keys).toEqual([
      `${jobId}/file1.txt`,
      `${jobId}/subdir/file2.txt`, // Forward slash required for S3
    ]);
  });

  it('should throw an error if the local directory does not exist on upload', async () => {
    const jobId = 'job-123';
    const nonExistentDir = path.join(tempDir, 'does-not-exist');

    await expect(adapter.uploadAssetBundle(jobId, nonExistentDir)).rejects.toThrow(/does not exist/);
  });

  it('should download an asset bundle from an s3:// URL', async () => {
    const jobId = 'job-123';
    const remoteUrl = `s3://${bucket}/${jobId}`;

    // Create a dummy file to stream
    const dummyFilePath = path.join(tempDir, 'dummy.txt');
    await fs.writeFile(dummyFilePath, 'dummy content');

    s3Mock.on(ListObjectsV2Command).resolves({
      IsTruncated: false,
      Contents: [
        { Key: `${jobId}/test.txt` },
        { Key: `${jobId}/subdir/test2.txt` },
      ],
    });

    s3Mock.on(GetObjectCommand).callsFake(async () => {
      return { Body: createReadStream(dummyFilePath) as any };
    });

    await adapter.downloadAssetBundle(jobId, remoteUrl, targetDir);

    expect(s3Mock.calls().filter(c => c.args[0].constructor.name === 'ListObjectsV2Command').length).toBe(1);
    expect(s3Mock.calls().filter(c => c.args[0].constructor.name === 'GetObjectCommand').length).toBe(2);

    // Verify files were created
    const file1 = await fs.readFile(path.join(targetDir, 'test.txt'), 'utf-8');
    const file2 = await fs.readFile(path.join(targetDir, 'subdir', 'test2.txt'), 'utf-8');
    expect(file1).toBe('dummy content');
    expect(file2).toBe('dummy content');
  });

  it('should handle pagination on download', async () => {
    const jobId = 'job-123';
    const remoteUrl = `s3://${bucket}/${jobId}`;

    const dummyFilePath = path.join(tempDir, 'dummy.txt');
    await fs.writeFile(dummyFilePath, 'dummy content');

    s3Mock.on(ListObjectsV2Command)
      .resolvesOnce({
        IsTruncated: true,
        NextContinuationToken: 'token123',
        Contents: [{ Key: `${jobId}/test1.txt` }],
      })
      .resolvesOnce({
        IsTruncated: false,
        Contents: [{ Key: `${jobId}/test2.txt` }],
      });

    s3Mock.on(GetObjectCommand).resolves({
      Body: createReadStream(dummyFilePath) as any,
    });

    await adapter.downloadAssetBundle(jobId, remoteUrl, targetDir);

    const listCalls = s3Mock.calls().filter(c => c.args[0].constructor.name === 'ListObjectsV2Command');
    expect(listCalls.length).toBe(2);
    expect(listCalls[0].args[0].input.ContinuationToken).toBeUndefined();
    expect(listCalls[1].args[0].input.ContinuationToken).toBe('token123');

    expect(s3Mock.calls().filter(c => c.args[0].constructor.name === 'GetObjectCommand').length).toBe(2);
  });

  it('should throw an error for unsupported remote URLs on download', async () => {
    const jobId = 'job-123';
    const remoteUrl = `local:///path/to/job`;

    await expect(adapter.downloadAssetBundle(jobId, remoteUrl, targetDir)).rejects.toThrow(/Unsupported remote URL scheme/);
  });

  it('should throw an error if mismatched bucket on download', async () => {
    const jobId = 'job-123';
    const remoteUrl = `s3://other-bucket/${jobId}`;

    await expect(adapter.downloadAssetBundle(jobId, remoteUrl, targetDir)).rejects.toThrow(/does not match adapter bucket/);
  });

  it('should throw an error if the remote directory does not exist or is empty on download', async () => {
    const jobId = 'job-123';
    const remoteUrl = `s3://${bucket}/${jobId}`;

    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [],
    });

    await expect(adapter.downloadAssetBundle(jobId, remoteUrl, targetDir)).rejects.toThrow(/does not exist or is empty/);
  });

  it('should delete an asset bundle', async () => {
    const jobId = 'job-123';
    const remoteUrl = `s3://${bucket}/${jobId}`;

    s3Mock.on(ListObjectsV2Command).resolves({
      IsTruncated: false,
      Contents: [
        { Key: `${jobId}/test.txt` },
        { Key: `${jobId}/subdir/test2.txt` },
      ],
    });

    s3Mock.on(DeleteObjectsCommand).resolves({});

    await adapter.deleteAssetBundle(jobId, remoteUrl);

    const deleteCalls = s3Mock.calls().filter(c => c.args[0].constructor.name === 'DeleteObjectsCommand');
    expect(deleteCalls.length).toBe(1);

    const deleteParams = deleteCalls[0].args[0].input;
    expect(deleteParams.Bucket).toBe(bucket);
    expect(deleteParams.Delete?.Objects).toEqual([
      { Key: `${jobId}/test.txt` },
      { Key: `${jobId}/subdir/test2.txt` },
    ]);
  });

  it('should not send delete command if no objects found', async () => {
    const jobId = 'job-123';
    const remoteUrl = `s3://${bucket}/${jobId}`;

    s3Mock.on(ListObjectsV2Command).resolves({
      IsTruncated: false,
      Contents: [],
    });

    await adapter.deleteAssetBundle(jobId, remoteUrl);

    const deleteCalls = s3Mock.calls().filter(c => c.args[0].constructor.name === 'DeleteObjectsCommand');
    expect(deleteCalls.length).toBe(0);
  });

  it('should throw an error for unsupported remote URLs on delete', async () => {
    const jobId = 'job-123';
    const remoteUrl = `local:///path/to/job`;

    await expect(adapter.deleteAssetBundle(jobId, remoteUrl)).rejects.toThrow(/Unsupported remote URL scheme/);
  });
});
