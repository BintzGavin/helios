import fs from 'node:fs/promises';
import path from 'node:path';
import { Storage, type StorageOptions } from '@google-cloud/storage';
import type { ArtifactStorage } from '../types/storage.js';

export interface GcsStorageAdapterOptions extends StorageOptions {
  /**
   * The name of the GCS bucket to use for storage.
   */
  bucket: string;
}

export class GcsStorageAdapter implements ArtifactStorage {
  private client: Storage;
  private bucketName: string;

  constructor(options: GcsStorageAdapterOptions) {
    const { bucket, ...clientOptions } = options;
    this.bucketName = bucket;
    this.client = new Storage(clientOptions);
  }

  async uploadAssetBundle(jobId: string, localDir: string): Promise<string> {
    try {
      await fs.access(localDir);
    } catch {
      throw new Error(`Local directory ${localDir} does not exist`);
    }

    const files = await this.getAllFiles(localDir);
    const bucket = this.client.bucket(this.bucketName);

    const uploadPromises = files.map(file => {
      const relativePath = path.relative(localDir, file);
      // Ensure GCS key uses forward slashes
      const gcsKey = `${jobId}/${relativePath.split(path.sep).join('/')}`;

      return bucket.upload(file, {
        destination: gcsKey,
      });
    });

    await Promise.all(uploadPromises);

    return `gcs://${this.bucketName}/${jobId}`;
  }

  async downloadAssetBundle(jobId: string, remoteUrl: string, targetDir: string): Promise<void> {
    const { bucket: remoteBucketName, prefix } = this.parseRemoteUrl(remoteUrl);

    if (remoteBucketName !== this.bucketName) {
      throw new Error(`Remote URL bucket ${remoteBucketName} does not match adapter bucket ${this.bucketName}`);
    }

    const bucket = this.client.bucket(this.bucketName);
    const [files] = await bucket.getFiles({ prefix: prefix + '/' });

    if (files.length === 0) {
      throw new Error(`Remote directory ${remoteUrl} does not exist or is empty`);
    }

    for (const file of files) {
      // Skip if the object is just the directory itself
      if (file.name === `${prefix}/`) continue;

      const relativePath = file.name.substring(prefix.length + 1);
      // Convert forward slashes back to OS specific separators
      const localFilePath = path.join(targetDir, ...relativePath.split('/'));
      const fileDir = path.dirname(localFilePath);

      await fs.mkdir(fileDir, { recursive: true });

      await file.download({ destination: localFilePath });
    }
  }

  async uploadJobSpec(jobId: string, spec: import('../types/job-spec.js').JobSpec): Promise<string> {
    const bucket = this.client.bucket(this.bucketName);
    const gcsKey = `${jobId}/job.json`;
    const file = bucket.file(gcsKey);

    const body = JSON.stringify(spec, null, 2);

    await file.save(body, {
      contentType: 'application/json',
    });

    return `gcs://${this.bucketName}/${gcsKey}`;
  }

  async deleteJobSpec(jobId: string, remoteUrl: string): Promise<void> {
    const { bucket: remoteBucketName, prefix } = this.parseRemoteUrl(remoteUrl);

    if (remoteBucketName !== this.bucketName) {
      throw new Error(`Remote URL bucket ${remoteBucketName} does not match adapter bucket ${this.bucketName}`);
    }

    const bucket = this.client.bucket(this.bucketName);
    const file = bucket.file(prefix);

    try {
      await file.delete();
    } catch (e: any) {
      if (e.code !== 404) throw e;
    }
  }

  async deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void> {
    const { bucket: remoteBucketName, prefix } = this.parseRemoteUrl(remoteUrl);

    if (remoteBucketName !== this.bucketName) {
      throw new Error(`Remote URL bucket ${remoteBucketName} does not match adapter bucket ${this.bucketName}`);
    }

    const bucket = this.client.bucket(this.bucketName);

    // GCS deleteFiles is a handy method that deletes all files matching the prefix
    await bucket.deleteFiles({ prefix: prefix + '/' });
  }

  private parseRemoteUrl(remoteUrl: string): { bucket: string; prefix: string } {
    if (!remoteUrl.startsWith('gcs://')) {
      throw new Error(`Unsupported remote URL scheme: ${remoteUrl}`);
    }

    const withoutScheme = remoteUrl.slice('gcs://'.length);
    const parts = withoutScheme.split('/');

    if (parts.length < 2) {
      throw new Error(`Invalid GCS URL format: ${remoteUrl}`);
    }

    const bucket = parts[0];
    const prefix = parts.slice(1).join('/');

    return { bucket, prefix };
  }

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function traverse(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }

    await traverse(dirPath);
    return files;
  }
}
