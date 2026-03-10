#### 1. Context & Goal
- **Objective**: Create an Azure Functions cloud adapter for the infrastructure package.
- **Trigger**: The V2 distributed rendering vision requires various cloud adapters to support distributed execution environments. Azure Functions is tracked in the Tier 1 backlog under "Platform Expansion" as an uncompleted task.
- **Impact**: Unlocks distributed rendering capabilities for users operating within the Azure ecosystem, extending the multi-cloud reach of the Helios platform.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/azure-functions-adapter.ts` (Implement the adapter)
  - `packages/infrastructure/tests/adapters/azure-functions-adapter.test.ts` (Unit tests)
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts` (Export the new adapter)
- **Read-Only**:
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/adapters/aws-adapter.ts`
  - `docs/BACKLOG.md`

#### 3. Implementation Spec
- **Architecture**: A new class `AzureFunctionsAdapter` implementing the `WorkerAdapter` interface. It handles invoking an Azure Function via HTTP POST, similar to the existing Cloudflare Workers adapter, using the native `fetch` API.
- **Pseudo-Code**:
  - `export interface AzureFunctionsAdapterConfig` with `serviceUrl`, optional `functionKey` (auth), and optional `jobDefUrl`.
  - `class AzureFunctionsAdapter implements WorkerAdapter`
  - `constructor(private config: AzureFunctionsAdapterConfig)`
  - `async execute(job: WorkerJob): Promise<WorkerResult>`
    - Check `job.meta.chunkId` and `jobDefUrl`.
    - Prepare payload: `{ jobPath, chunkIndex }`.
    - Prepare headers: `Content-Type: application/json`. If `functionKey` is provided, add `x-functions-key: ${functionKey}`.
    - Send `POST` request to `serviceUrl`.
    - Await response, handling JSON or plain text.
    - Return `exitCode`, `stdout`, `stderr`, and `durationMs`.
    - Catch network errors or abort signals gracefully.
- **Public API Changes**: Exports `AzureFunctionsAdapter` and `AzureFunctionsAdapterConfig` from `packages/infrastructure/src/adapters/index.ts`.
- **Dependencies**: None. (Uses `fetch`)
- **Cloud Considerations**: Follows the HTTP trigger pattern standard for Azure Functions. The payload matches what other stateless workers expect (`jobPath` and `chunkIndex`). Auth uses the standard `x-functions-key` header.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/infrastructure -- tests/adapters/azure-functions-adapter.test.ts`
- **Success Criteria**:
  - Adapter correctly throws if `chunkId` or `jobDefUrl` are missing.
  - Sends correct payload to the specified `serviceUrl`.
  - Properly applies the `x-functions-key` authentication header if provided.
  - Gracefully handles non-200 HTTP responses, abort signals, and network failures.
- **Edge Cases**: Verify behavior on 500 responses, network disconnects mid-request, or invalid JSON response bodies.
- **Integration Verification**: Will be verified as part of the full infrastructure test suite `npm run test -w packages/infrastructure`.