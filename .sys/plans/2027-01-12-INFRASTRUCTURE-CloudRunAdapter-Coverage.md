#### 1. Context & Goal
- **Objective**: Achieve 100% test coverage for `CloudRunAdapter`.
- **Trigger**: The V2 distributed rendering vision requires reliable cloud execution, and `CloudRunAdapter` currently has gaps in its error handling and caching test coverage (lines 29, 91, 107).
- **Impact**: Ensures that transient HTTP errors, fallback HTTP error messages, and GoogleAuth client caching logic work correctly under all scenarios.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/cloudrun-adapter.test.ts` (Add test coverage)
- **Read-Only**: `packages/infrastructure/src/adapters/cloudrun-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Append unit tests using Vitest to `packages/infrastructure/tests/cloudrun-adapter.test.ts`.
- **Pseudo-Code**:
  - Add test: "should use cached client on subsequent executions" by calling `adapter.execute` twice and verifying `mockGetIdTokenClient` is only called once (covers line 29).
  - Add test: "should fallback to statusText when stderr is missing on non-200 response" by mocking a 500 status code with `{ data: { exitCode: 1, stdout: '' } }` to ensure it falls back to `HTTP Error 500: Internal Server Error` (covers line 91).
  - Add test: "should fallback to statusText when data is undefined on exception" by throwing an error with `error.response = { status: 404, statusText: 'Not Found', data: undefined }` (covers line 107).
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Ensures the Google auth client efficiently connects to Cloud Run and properly reports exceptions.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: Vitest output reports 100% coverage for `cloudrun-adapter.ts`.
- **Edge Cases**: Verifies missing data properties and `undefined` stderr correctly fallback to HTTP codes.
- **Integration Verification**: Not required.