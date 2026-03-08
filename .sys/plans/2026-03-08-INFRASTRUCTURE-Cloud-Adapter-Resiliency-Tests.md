#### 1. Context & Goal
- **Objective**: Implement comprehensive resiliency and regression tests for `AwsLambdaAdapter` and `CloudRunAdapter`.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision, meaning we must focus on allowed fallback actions such as "Regression tests" as per `AGENTS.md`. We have already added resiliency tests for `JobExecutor`, `WorkerRuntime`, `JobManager`, `FileJobRepository`, and `StorageAdapters`. We need to add them for Cloud Adapters.
- **Impact**: Ensures that cloud execution adapters handle edge cases, malformed data, and network failures gracefully.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/aws-adapter.test.ts`, `packages/infrastructure/tests/cloudrun-adapter.test.ts`
- **Read-Only**: `packages/infrastructure/src/adapters/aws-adapter.ts`, `packages/infrastructure/src/adapters/cloudrun-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing test suites for AWS and CloudRun adapters to test resilience.
- **Pseudo-Code**:
  - `AwsLambdaAdapter Resiliency Tests`: Test throwing/handling of `LambdaClient.send` errors, testing invalid payloads, missing `chunkId`.
  - `CloudRunAdapter Resiliency Tests`: Test throwing/handling of `GoogleAuth.getIdTokenClient` errors, request timeouts, non-200 status codes.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: The tests should mock `aws-sdk-client-mock` and `google-auth-library` to simulate network failures and edge cases.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/infrastructure -- tests/aws-adapter.test.ts` and `npm run test -w packages/infrastructure -- tests/cloudrun-adapter.test.ts`
- **Success Criteria**: All new resiliency tests pass.
- **Edge Cases**: AWS and Google auth client failures, invalid configurations.
- **Integration Verification**: Ensure existing E2E and orchestration tests still pass.
