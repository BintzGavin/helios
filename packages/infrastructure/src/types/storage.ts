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

  /**
   * Deletes an asset bundle from remote storage.
   * @param jobId The ID of the job the assets belong to.
   * @param remoteUrl The remote URL or identifier of the bundle to delete.
   */
  deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void>;

  /**
   * Uploads a job specification as a JSON file to remote storage.
   * @param jobId The ID of the job.
   * @param spec The JobSpec object to upload.
   * @returns A promise that resolves to the remote URL of the uploaded spec.
   */
  uploadJobSpec(jobId: string, spec: import('./job-spec.js').JobSpec): Promise<string>;

  /**
   * Deletes a job specification JSON file from remote storage.
   * @param jobId The ID of the job.
   * @param remoteUrl The remote URL of the spec to delete.
   */
  deleteJobSpec(jobId: string, remoteUrl: string): Promise<void>;
}
