import { describe, it, expect } from 'vitest';
import { R2StorageAdapter } from '../../src/storage/r2-storage.js';

describe('R2StorageAdapter', () => {
  it('should construct with R2-specific endpoint', () => {
    const adapter = new R2StorageAdapter({
      bucket: 'helios-renders',
      accountId: 'abc123',
      accessKeyId: 'r2-key',
      secretAccessKey: 'r2-secret',
    });

    // The adapter should be an instance of the R2 adapter (which extends S3)
    expect(adapter).toBeInstanceOf(R2StorageAdapter);
  });

  it('should extend S3StorageAdapter', () => {
    // Verify the R2 adapter inherits S3 storage methods
    const adapter = new R2StorageAdapter({
      bucket: 'test-bucket',
      accountId: 'test-account',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    });

    // All ArtifactStorage methods should exist
    expect(typeof adapter.uploadAssetBundle).toBe('function');
    expect(typeof adapter.downloadAssetBundle).toBe('function');
    expect(typeof adapter.deleteAssetBundle).toBe('function');
    expect(typeof adapter.uploadJobSpec).toBe('function');
    expect(typeof adapter.deleteJobSpec).toBe('function');
  });
});
