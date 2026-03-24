import { S3StorageAdapter, S3StorageAdapterOptions } from './s3-storage.js';

export interface R2StorageAdapterOptions extends Omit<S3StorageAdapterOptions, 'region' | 'endpoint' | 'forcePathStyle'> {
  /** Cloudflare account ID (used to derive the R2 endpoint) */
  accountId: string;
  /** R2 access key ID (from the R2 API tokens page) */
  accessKeyId: string;
  /** R2 secret access key */
  secretAccessKey: string;
}

/**
 * Artifact storage adapter for Cloudflare R2.
 *
 * R2 is S3-compatible, so this adapter extends S3StorageAdapter with
 * R2-specific defaults (endpoint URL, credentials, region).
 *
 * Useful for:
 * - Storing rendered video chunks for distributed rendering
 * - Log harvesting from sandbox containers
 * - Checkpoint/resume data for long renders
 *
 * Usage:
 * ```typescript
 * const storage = new R2StorageAdapter({
 *   bucket: 'helios-renders',
 *   accountId: 'your-cf-account-id',
 *   accessKeyId: 'your-r2-access-key',
 *   secretAccessKey: 'your-r2-secret-key',
 * });
 * ```
 */
export class R2StorageAdapter extends S3StorageAdapter {
  constructor(options: R2StorageAdapterOptions) {
    const { accountId, accessKeyId, secretAccessKey, ...rest } = options;

    super({
      ...rest,
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
    });
  }
}
