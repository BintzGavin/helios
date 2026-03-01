export interface ArtifactStorage {
  /**
   * Uploads an asset bundle from a local directory to remote storage.
   * @param jobId The ID of the job the assets belong to.
   * @param localDir The local directory containing the assets to upload.
   * @returns A promise that resolves to the remote URL or identifier of the uploaded bundle.
   */
  uploadAssetBundle(jobId: string, localDir: string): Promise<string>;

  /**
   * Downloads an asset bundle from remote storage to a local directory.
   * @param jobId The ID of the job the assets belong to.
   * @param remoteUrl The remote URL or identifier of the bundle to download.
   * @param targetDir The local directory to download the assets into.
   */
  downloadAssetBundle(jobId: string, remoteUrl: string, targetDir: string): Promise<void>;
}
