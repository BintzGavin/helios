#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the use of `S3StorageAdapter` with `JobManager` to manage remote assets for distributed rendering.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision (stateless workers, cloud adapters, deterministic seeking, artifact storage, governance tooling are all implemented). According to AGENTS.md, when no feature gaps exist, the agent must focus on allowed fallback actions. "Examples" are an explicitly allowed fallback action.
- **Impact**: Provides a concrete, runnable demonstration of how to configure and utilize the infrastructure package for cloud-based distributed rendering using AWS S3, improving developer onboarding.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/s3-storage.ts` (Example script demonstrating S3 integration)
- **Modify**:
  - `packages/infrastructure/package.json` (Add a script to run the example, e.g., `"example:s3": "npx tsx examples/s3-storage.ts"`)
- **Read-Only**:
  - `packages/infrastructure/src/orchestrator/job-manager.ts`
  - `packages/infrastructure/src/storage/s3-storage.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Provide a standalone TypeScript script that initializes an `S3StorageAdapter` (configured to use mock credentials or rely on environment variables).
  - Instantiate a `JobManager` using this storage adapter.
  - Submit a mock `JobSpec` and simulate a local run that uses the storage adapter to upload an asset bundle and a job specification file, then delete them to clean up.
- **Pseudo-Code**:
  ```typescript
  // In s3-storage.ts
  import { S3StorageAdapter, JobManager, InMemoryJobRepository, JobExecutor, LocalWorkerAdapter } from '../src/index.js';
  import { S3Client } from '@aws-sdk/client-s3';

  // Note: Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_BUCKET_NAME in environment.
  const bucketName = process.env.AWS_BUCKET_NAME || 'my-test-bucket';
  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

  const storage = new S3StorageAdapter(s3Client, bucketName);
  const repository = new InMemoryJobRepository();
  const executor = new JobExecutor(new LocalWorkerAdapter());
  const manager = new JobManager(repository, executor, storage);

  // Submit job and demonstrate upload process...
  ```
- **Public API Changes**: None. This is strictly an example addition.
- **Dependencies**: The `@aws-sdk/client-s3` dependency must be installed as a peer or dev dependency, or the script should clearly document that it is required to run.
- **Cloud Considerations**: The example script should clearly explain that actual AWS credentials and an S3 bucket are required for it to run successfully against a real cloud environment, but it should fail gracefully if they are missing.

#### 4. Test Plan
- **Verification**: Run `npm run lint -w packages/infrastructure` to ensure the script has no syntax errors. Run the example (e.g. `npx tsx packages/infrastructure/examples/s3-storage.ts`) and verify it attempts to run.
- **Success Criteria**: The example file is created, valid TypeScript, and demonstrates the end-to-end integration of `S3StorageAdapter` with the orchestrator.
- **Edge Cases**: Graceful error handling if the S3 bucket does not exist or credentials are not configured.
- **Integration Verification**: The example should successfully import from the `infrastructure` package source.
