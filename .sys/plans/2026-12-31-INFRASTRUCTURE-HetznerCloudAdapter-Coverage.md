#### 1. Context & Goal
- **Objective**: Improve test coverage for `HetznerCloudAdapter` by handling edge cases.
- **Trigger**: The domain has reached gravitational equilibrium. Routine execution to ensure robustness of `packages/infrastructure`.
- **Impact**: Improves the code quality and test coverage. `HetznerCloudAdapter` coverage will increase to 100%.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/adapters/hetzner-cloud-adapter.test.ts`
- **Read-Only**: `packages/infrastructure/src/adapters/hetzner-cloud-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Update tests to handle untested blocks. The missing branches are:
  - 35: `throw new Error('Job aborted before execution');`
  - 85: `throw new Error('Execution timeout exceeded');`
  - 97: `throw new Error(\`Failed to poll server status: ${getResponse.status}\`);`
  - 126: `stderr += \`\nFailed to clean up server: ${cleanupError.message}\`;`

- **Pseudo-Code**: High-level logic flow is just adding tests for error scenarios.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `npm install --no-save @vitest/coverage-v8 && npx vitest --coverage` in `packages/infrastructure`.
- **Success Criteria**: Line coverage of `src/adapters/hetzner-cloud-adapter.ts` is 100%.
- **Edge Cases**: None
- **Integration Verification**: Ensure all tests still pass.