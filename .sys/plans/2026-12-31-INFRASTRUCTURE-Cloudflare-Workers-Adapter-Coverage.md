#### 1. Context & Goal
- **Objective**: Improve test coverage for the Cloudflare Workers execution adapter (`CloudflareWorkersAdapter`).
- **Trigger**: The Infrastructure domain is in an incubating / expanding phase. The Backlog states this is a "Tier 1 - High Impact, Low Friction" item. The adapter currently has 93.1% branch coverage with missed paths on lines 66 and 72 regarding `exitCode` resolution.
- **Impact**: Better test coverage ensures that the `CloudflareWorkersAdapter` handles execution, authentication, aborts, and HTTP errors correctly, and reaches 100% test coverage for this file.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/adapters/cloudflare-workers-adapter.test.ts` (Implement tests for the CloudflareWorkersAdapter to cover missed lines 66 and 72)
- **Read-Only**: `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: The test file will use Vitest to mock `fetch` and verify that `CloudflareWorkersAdapter` handles requests to the Cloudflare Worker service correctly, including the missed edge cases for `exitCode` logic.
- **Pseudo-Code**:
  - Add test for line 66: verify the scenario where `response.ok` is false and no `exitCode` is returned in the response payload. Specifically, mock a text response (which sets `data = { stdout: text }` and lacks `data.exitCode`). In this case, `typeof data.exitCode !== 'number'`, so it falls back to `(response.ok ? 0 : 1)`. Since `response.ok` is mocked as false, `exitCode` becomes 1.
  - Add test for line 72: verify the scenario where `!response.ok` but the response payload explicitly includes `exitCode: 0`. For example, mock a JSON response with status 500 and `{ exitCode: 0 }`. In this case, line 72 `exitCode !== 0 ? exitCode : 1` evaluates to 1 because `exitCode` is exactly 0.
  - Add test for line 66 / 72 fallback logic: verify the scenario where the response is plain text (e.g. missing `content-type` header) but `response.ok` is true. `data.exitCode` will be undefined, so it falls back to `(response.ok ? 0 : 1)`, which evaluates to 0.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: The tests verify the `CloudflareWorkersAdapter` logic to interact with Cloudflare's HTTP interface without making real network requests.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test -- --coverage`
- **Success Criteria**: `cloudflare-workers-adapter.ts` reaches 100% test coverage.
- **Edge Cases**: Missing `chunkId`, missing `jobDefUrl`, HTTP failures, aborted requests.
- **Integration Verification**: Ensure all tests pass.
