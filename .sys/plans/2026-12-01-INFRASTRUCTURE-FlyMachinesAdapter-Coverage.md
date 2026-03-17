#### 1. Context & Goal
- **Objective**: Expand test coverage for `FlyMachinesAdapter`.
- **Trigger**: The line where `createRes.text()` fails is missing test coverage.
- **Impact**: Attains 100% test coverage for the `FlyMachinesAdapter`.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/infrastructure/tests/adapters/fly-machines-adapter.test.ts`]
- **Read-Only**: [`packages/infrastructure/src/adapters/fly-machines-adapter.ts`]

#### 3. Implementation Spec
- **Architecture**: Expand existing test suite to cover the missing edge case in the `catch` block of `createRes.text()`.
- **Pseudo-Code**:
  - Mock the `fetch` response for machine creation to return a `400` status with `ok: false`.
  - In the mocked response, override the `text` method to throw an error, simulating a failure to read the response body.
  - Call `adapter.execute(job)` and expect it to reject with an error message that ends with an empty string after the status text, as the `catch` block resolves to `''`.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Ensure it mimics the exact failure behavior of the Fly API.

#### 4. Test Plan
- **Verification**: Run `npx vitest run tests/adapters/fly-machines-adapter.test.ts --coverage`
- **Success Criteria**: 100% test coverage is reported for `fly-machines-adapter.ts`.
- **Edge Cases**: Ensure the test specifically targets the `.catch(() => '')` block in the adapter logic.
- **Integration Verification**: Ensure it works within the broader suite by running `npm run test` in the `packages/infrastructure` workspace.
