#### 1. Context & Goal
- **Objective**: Achieve 100% test coverage for the `HetznerCloudAdapter` by fully testing optional config properties and job arguments formatting.
- **Trigger**: The domain is in gravitational equilibrium, but tests for `HetznerCloudAdapter` only achieve 95% branch coverage.
- **Impact**: Ensures that edge cases such as optional `location` and `sshKeyId` parameters are properly appended to requests, and job command string interpolation behaves correctly.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/adapters/hetzner-cloud-adapter.test.ts` (Add tests for optional config properties like `location`, `sshKeyId`, and missing `args`)
- **Read-Only**: `packages/infrastructure/src/adapters/hetzner-cloud-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Update `hetzner-cloud-adapter.test.ts` to explicitly simulate edge cases and inspect the JSON payload pushed to `fetch`.
- **Pseudo-Code**:
  - Add test `should include location and ssh_keys when provided in config`
  - Add test `should trim job command properly when args is not provided`
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Accurate test coverage ensures parameter passing is robust when creating resources in Hetzner Cloud.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npx vitest --coverage tests/adapters/hetzner-cloud-adapter.test.ts`
- **Success Criteria**: Coverage report shows 100% statement and branch coverage for `hetzner-cloud-adapter.ts`.
- **Edge Cases**: Empty arguments array, missing args, optional cloud configuration properties.
- **Integration Verification**: `npm run test` in `packages/infrastructure` passes successfully.
