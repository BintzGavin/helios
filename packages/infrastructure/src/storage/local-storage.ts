import fs from 'node:fs/promises';
import path from 'node:path';
import type { ArtifactStorage } from '../types/storage.js';

export interface LocalStorageAdapterOptions {
  /**
   * The base directory to act as the "remote" storage location.
   */
  storageDir: string;
}

export class LocalStorageAdapter implements ArtifactStorage {
  private storageDir: string;

  constructor(options: LocalStorageAdapterOptions) {
    this.storageDir = options.storageDir;
  }

  async uploadAssetBundle(jobId: string, localDir: string): Promise<string> {
    const remoteDir = path.join(this.storageDir, jobId);
    await fs.mkdir(remoteDir, { recursive: true });

    // Ensure localDir exists before copying
    try {
      await fs.access(localDir);
    } catch {
      throw new Error(`Local directory ${localDir} does not exist`);
    }

    await fs.cp(localDir, remoteDir, { recursive: true });

    return `local://${remoteDir}`;
  }

  async downloadAssetBundle(jobId: string, remoteUrl: string, targetDir: string): Promise<void> {
    if (!remoteUrl.startsWith('local://')) {
      throw new Error(`Unsupported remote URL scheme: ${remoteUrl}`);
    }

    const remoteDir = remoteUrl.slice('local://'.length);

    try {
      await fs.access(remoteDir);
    } catch {
      throw new Error(`Remote directory ${remoteDir} does not exist`);
    }

    await fs.mkdir(targetDir, { recursive: true });
    await fs.cp(remoteDir, targetDir, { recursive: true });
  }

  async deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void> {
    if (!remoteUrl.startsWith('local://')) {
      throw new Error(`Unsupported remote URL scheme: ${remoteUrl}`);
    }

    const remoteDir = remoteUrl.slice('local://'.length);

    // Security: Prevent directory traversal
    const resolvedRemoteDir = path.resolve(remoteDir);
    const resolvedStorageDir = path.resolve(this.storageDir);

    if (
      resolvedRemoteDir !== resolvedStorageDir &&
      !resolvedRemoteDir.startsWith(resolvedStorageDir + path.sep)
    ) {
      throw new Error(`Invalid remote URL: Path traversal detected in ${remoteUrl}`);
    }

    await fs.rm(resolvedRemoteDir, { recursive: true, force: true });
  }
}
