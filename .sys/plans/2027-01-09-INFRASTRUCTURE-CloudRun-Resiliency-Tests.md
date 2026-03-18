#### 1. Context & Goal
- **Objective**: Create `cloudrun-server-resiliency.test.ts` to ensure `cloudrun-server.ts` meets 100% test coverage and addresses all edge cases in the Cloud Run worker entrypoint, establishing parity with AWS Lambda resiliency tests.
- **Trigger**: The codebase has `aws-handler-resiliency.test.ts` for AWS Lambda entrypoint but `cloudrun-server-resiliency.test.ts` is missing, causing a parity gap in deployment tooling resiliency verification.
- **Impact**: Ensures resilient HTTP error handling within the Cloud Run worker execution flow.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/worker/cloudrun-server-resiliency.test.ts`
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/worker/cloudrun-server.ts`

#### 3. Implementation Spec
- **Architecture**: Create an explicit resiliency test suite for `createCloudRunServer`. Test specific edge cases that cause HTTP request processing or `JSON.parse` failures, or internal server errors not already covered by standard unit tests.
- **Pseudo-Code**:
  - Mock `WorkerRuntime`.
  - Test request with missing body.
  - Test request with malformed JSON causing `JSON.parse` to throw.
  - Test request where `chunkIndex` is missing but `jobPath` exists.
  - Test server port defaulting logic if not explicitly provided.
  - Test HTTP server close mechanism.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Replicates edge case payloads sent by Google Cloud Run.

#### 4. Test Plan
- **Verification**: `npm run test -- tests/worker/cloudrun-server-resiliency.test.ts`
- **Success Criteria**: All resiliency tests pass and total test coverage for `src/worker/cloudrun-server.ts` remains at 100%.
- **Edge Cases**: Malformed JSON, network interruption during payload receiving, invalid port configuration.
- **Integration Verification**: N/A