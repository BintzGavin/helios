#### 1. Context & Goal
- **Objective**: Improve test coverage for `HetznerCloudAdapter` by adding tests for missing branches (lines 40-59).
- **Trigger**: The status log and coverage report show that `hetzner-cloud-adapter.ts` does not have 100% test coverage.
- **Impact**: Ensures that edge cases such as optional location and sshKeyId parameters are handled correctly by the adapter.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/adapters/hetzner-cloud-adapter.test.ts` (Add tests for optional config properties like `location` and `sshKeyId`)
- **Read-Only**: `packages/infrastructure/src/adapters/hetzner-cloud-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Improve unit tests to explicitly cover unhandled code paths using `vitest`.
- **Pseudo-Code**:
  - `hetzner-cloud-adapter.test.ts`: Add a test that initializes `HetznerCloudAdapter` with `location` and `sshKeyId` config parameters, then verify that the `fetch` call for creating the server includes these parameters in the request body.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Accurate test coverage ensures reliability for the Hetzner Cloud execution adapter.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: `coverage-output.txt` shows `100%` Statement and Branch coverage for `hetzner-cloud-adapter.ts`.
- **Edge Cases**: Covered by the new tests.
- **Integration Verification**: The adapter correctly fulfills the `WorkerAdapter` interface and tests pass.