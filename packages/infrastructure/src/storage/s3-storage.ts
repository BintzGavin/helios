import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import type { ArtifactStorage } from '../types/storage.js';

export interface S3StorageAdapterOptions extends S3ClientConfig {
  /**
   * The name of the S3 bucket to use for storage.
   */
  bucket: string;
}

export class S3StorageAdapter implements ArtifactStorage {
  private client: S3Client;
  private bucket: string;

  constructor(options: S3StorageAdapterOptions) {
    const { bucket, ...clientOptions } = options;
    this.bucket = bucket;
    this.client = new S3Client(clientOptions);
  }

  async uploadAssetBundle(jobId: string, localDir: string): Promise<string> {
    try {
      await fs.access(localDir);
    } catch {
      throw new Error(`Local directory ${localDir} does not exist`);
    }

    const files = await this.getAllFiles(localDir);

    for (const file of files) {
      const relativePath = path.relative(localDir, file);
      // Ensure S3 key uses forward slashes
      const s3Key = `${jobId}/${relativePath.split(path.sep).join('/')}`;

      const fileStream = createReadStream(file);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileStream,
      });

      await this.client.send(command);
    }

    return `s3://${this.bucket}/${jobId}`;
  }

  async downloadAssetBundle(jobId: string, remoteUrl: string, targetDir: string): Promise<void> {
    const { bucket, prefix } = this.parseRemoteUrl(remoteUrl);

    if (bucket !== this.bucket) {
      throw new Error(`Remote URL bucket ${bucket} does not match adapter bucket ${this.bucket}`);
    }

    let isTruncated = true;
    let continuationToken: string | undefined;
    let fileCount = 0;

    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix + '/', // Ensure we only get files under the directory
        ContinuationToken: continuationToken,
      });

      const listResponse = await this.client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        for (const object of listResponse.Contents) {
          if (!object.Key) continue;

          // Skip if the object is just the directory itself
          if (object.Key === `${prefix}/`) continue;

          fileCount++;
          const relativePath = object.Key.substring(prefix.length + 1);
          // Convert forward slashes back to OS specific separators
          const localFilePath = path.join(targetDir, ...relativePath.split('/'));
          const fileDir = path.dirname(localFilePath);

          await fs.mkdir(fileDir, { recursive: true });

          const getCommand = new GetObjectCommand({
            Bucket: this.bucket,
            Key: object.Key,
          });

          const getResponse = await this.client.send(getCommand);

          if (getResponse.Body) {
             const writeStream = createWriteStream(localFilePath);
             // Web Stream from SDK v3 requires transformation to Node Stream
             // But actually, getResponse.Body is a Readable in Node.js environments
             // Wait for the stream to finish writing
             await new Promise<void>((resolve, reject) => {
               const nodeStream = getResponse.Body as NodeJS.ReadableStream;
               nodeStream.pipe(writeStream);
               writeStream.on('finish', () => resolve());
               writeStream.on('error', reject);
               nodeStream.on('error', reject);
             });
          }
        }
      }

      isTruncated = listResponse.IsTruncated ?? false;
      continuationToken = listResponse.NextContinuationToken;
    }

    if (fileCount === 0) {
        throw new Error(`Remote directory ${remoteUrl} does not exist or is empty`);
    }
  }

  async uploadJobSpec(jobId: string, spec: import('../types/job-spec.js').JobSpec): Promise<string> {
    const s3Key = `${jobId}/job.json`;
    const body = JSON.stringify(spec, null, 2);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: body,
      ContentType: 'application/json',
    });

    await this.client.send(command);

    return `s3://${this.bucket}/${s3Key}`;
  }

  async deleteJobSpec(jobId: string, remoteUrl: string): Promise<void> {
    const { bucket, prefix } = this.parseRemoteUrl(remoteUrl);

    if (bucket !== this.bucket) {
      throw new Error(`Remote URL bucket ${bucket} does not match adapter bucket ${this.bucket}`);
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: prefix, // the prefix here is the file key: jobId/job.json
    });

    await this.client.send(deleteCommand);
  }

  async deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void> {
    const { bucket, prefix } = this.parseRemoteUrl(remoteUrl);

    if (bucket !== this.bucket) {
      throw new Error(`Remote URL bucket ${bucket} does not match adapter bucket ${this.bucket}`);
    }

    let isTruncated = true;
    let continuationToken: string | undefined;

    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix + '/', // Ensure we only get files under the directory
        ContinuationToken: continuationToken,
      });

      const listResponse = await this.client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const objectsToDelete = listResponse.Contents
          .filter(obj => obj.Key !== undefined)
          .map(obj => ({ Key: obj.Key as string }));

        if (objectsToDelete.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: objectsToDelete,
              Quiet: true,
            },
          });

          await this.client.send(deleteCommand);
        }
      }

      isTruncated = listResponse.IsTruncated ?? false;
      continuationToken = listResponse.NextContinuationToken;
    }
  }

  private parseRemoteUrl(remoteUrl: string): { bucket: string; prefix: string } {
    if (!remoteUrl.startsWith('s3://')) {
      throw new Error(`Unsupported remote URL scheme: ${remoteUrl}`);
    }

    const withoutScheme = remoteUrl.slice('s3://'.length);
    const parts = withoutScheme.split('/');

    if (parts.length < 2) {
      throw new Error(`Invalid S3 URL format: ${remoteUrl}`);
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
