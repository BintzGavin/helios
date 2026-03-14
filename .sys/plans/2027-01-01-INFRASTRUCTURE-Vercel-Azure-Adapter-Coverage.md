#### 1. Context & Goal
- **Objective**: Improve test coverage for `AzureFunctionsAdapter` and `VercelAdapter` edge cases to reach 100%.
- **Trigger**: The status log and coverage report show that `azure-functions-adapter.ts` and `vercel-adapter.ts` do not have 100% test coverage.
- **Impact**: Ensures that edge cases such as malformed JSON responses and missing default fields are handled correctly by the adapters without causing unexpected crashes.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/adapters/azure-functions-adapter.test.ts` (Add tests for JSON parsing failure and text response handling)
- **Modify**: `packages/infrastructure/tests/adapters/vercel-adapter.test.ts` (Add tests for defaulting missing fields in the JSON response payload)
- **Read-Only**: `packages/infrastructure/src/adapters/azure-functions-adapter.ts`, `packages/infrastructure/src/adapters/vercel-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Improve unit tests to explicitly cover unhandled code paths using `vitest`.
- **Pseudo-Code**:
  - `azure-functions-adapter.test.ts`: Mock fetch with `content-type: application/json` throwing an error inside `.json()`. Mock fetch with `content-type: text/plain` returning raw text.
  - `vercel-adapter.test.ts`: Mock fetch returning an object without `exitCode`, `stdout`, `stderr`, and `durationMs` to verify fallback defaults.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Accurate test coverage ensures reliability for Azure Functions and Vercel cloud execution adapters.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: `coverage-output.txt` shows `100%` Statement and Branch coverage for both `azure-functions-adapter.ts` and `vercel-adapter.ts`.
- **Edge Cases**: Covered by the new tests.
- **Integration Verification**: The adapters correctly fulfill the `WorkerAdapter` interface and tests pass.