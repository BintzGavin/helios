#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the use of `CloudRunAdapter` with `JobManager` for simulated distributed rendering.
- **Trigger**: The INFRASTRUCTURE domain has reached a point where all core functionality is implemented. According to `AGENTS.md` and the backlog, allowed fallback actions include creating examples to demonstrate functionality. Currently, there are examples for local, GCS, S3, and AWS Lambda, but none for the Google Cloud Run adapter.
- **Impact**: Provides clear documentation and an executable example for users to understand how to configure and orchestrate distributed rendering jobs using Google Cloud Run, fulfilling the V2 cloud execution vision.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/cloudrun.ts`: A script demonstrating the setup and execution of a distributed rendering job using `CloudRunAdapter`, `FileJobRepository`, and `JobManager`.
- **Modify**: []
- **Read-Only**:
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts`
  - `packages/infrastructure/examples/aws-lambda.ts` (as a reference template)

#### 3. Implementation Spec
- **Architecture**: The example will follow the pattern established by `aws-lambda.ts`. It will initialize the `CloudRunAdapter` with a mock service URL (configurable via environment variables), wrap it in a `JobExecutor`, set up a `FileJobRepository`, and orchestrate a mock `JobSpec` via `JobManager`.
- **Pseudo-Code**:
  1. Load `GCP_SERVICE_URL` and `GCP_JOB_DEF_URL` from the environment, defaulting to mock values if absent.
  2. Initialize `CloudRunAdapter` with the service URL and job definition URL.
  3. Initialize `JobExecutor`, `FileJobRepository` (in a temporary `.job-store` directory), and `JobManager`.
  4. Define a mock `JobSpec` with a couple of rendering chunks.
  5. Submit the job to the manager.
  6. Poll the job status until completion or timeout (since it's a mock endpoint, it will likely time out or fail unless a real URL is provided, which is expected for the example).
  7. Clean up the local repository directory.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The example will highlight the required environment variables or configuration (`serviceUrl`) needed to authenticate and interact with Google Cloud Run via OIDC ID Tokens.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/infrastructure/examples/cloudrun.ts` from the root directory.
- **Success Criteria**: The script executes, outputs configuration details, submits the mock job, polls for status updates, and gracefully cleans up the local storage directory without crashing. It should print the expected final job state (likely failed/timeout due to the mock URL, which is documented as expected behavior).
- **Edge Cases**: Ensure the cleanup block runs even if the job submission or polling throws an error.
- **Integration Verification**: Not strictly applicable as this is an isolated example script, but it verifies the public API surface of `CloudRunAdapter` and `JobManager` is usable.
