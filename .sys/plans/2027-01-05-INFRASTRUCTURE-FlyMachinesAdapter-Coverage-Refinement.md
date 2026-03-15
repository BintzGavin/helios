#### 1. Context & Goal
- **Objective**: Achieve 100% test coverage for the `FlyMachinesAdapter` by covering missing edge cases.
- **Trigger**: Domain is in gravitational equilibrium. Recent coverage analysis shows `fly-machines-adapter.ts` lines 90 and 95 remain uncovered.
- **Impact**: Ensures resilient execution on Fly.io by handling all API response variations and transient polling conditions.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/adapters/fly-machines-adapter.test.ts` (Add tests to cover fallback exit codes and transient polling errors)
- **Read-Only**: `packages/infrastructure/src/adapters/fly-machines-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Add vitest unit tests to specifically mock `fetch` responses where `pollRes.ok === false` (simulating transient network issues during polling) and where `exit_event` is missing from the state data (ensuring fallback to `0`).
- **Pseudo-Code**:
  - Add test `should handle missing exit event in polling response (fallback to 0)`
  - Add test `should continue polling if poll response is not ok (e.g., transient network error)`
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Simulation of Fly.io Machines API anomalies.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npx vitest --coverage tests/adapters/fly-machines-adapter.test.ts`
- **Success Criteria**: Coverage report shows 100% statement and branch coverage for `fly-machines-adapter.ts` (lines 90 and 95 covered).
- **Edge Cases**: Missing `exit_event` structure, `fetch` returning `ok: false` during the polling loop.
- **Integration Verification**: `npm run test` in `packages/infrastructure` passes successfully.
