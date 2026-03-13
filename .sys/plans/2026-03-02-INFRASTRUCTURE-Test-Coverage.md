#### 1. Context & Goal
- **Objective**: Improve test coverage for the `packages/infrastructure` domain.
- **Trigger**: The domain has reached gravitational equilibrium (all explicit V2 backlog features are implemented and completed), but we need to expand test coverage to ensure resilience and maintain the platform's stability.
- **Impact**: Ensures that critical infrastructure logic, particularly within adapters and types, is thoroughly tested and resilient against future regressions.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/types/job-status.test.ts` (New test file for `InMemoryJobRepository`)
- **Modify**:
  - `packages/infrastructure/tests/aws-adapter.test.ts` (Add tests to cover missing branches and error conditions)
- **Read-Only**:
  - `packages/infrastructure/src/adapters/aws-adapter.ts`
  - `packages/infrastructure/src/types/job-status.ts`

#### 3. Implementation Spec
- **Architecture**: Enhance unit test suites to exercise edge cases, error handling paths, and specific branches in adapter implementations that are currently uncovered.
- **Pseudo-Code**:
  - In `aws-adapter.test.ts`, add test cases that mock AWS SDK client commands to simulate different types of SDK errors (e.g., missing payload edge cases) to ensure the adapter maps them to correct structures.
  - For `job-status.ts`, create a test suite in `packages/infrastructure/tests/types/job-status.test.ts` to verify the functionality of `InMemoryJobRepository` (e.g., `save`, `get`, `list`, `delete` methods).
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Ensure AWS mock responses simulate real-world failure modes.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test -- --coverage`.
- **Success Criteria**: Statement test coverage for `aws-adapter.ts` increases, and overall package test coverage improves above its current baseline.
- **Edge Cases**: Mocking tricky AWS SDK client behaviors like partial or invalid JSON payloads in the lambda response.
- **Integration Verification**: Verify that adding tests does not break any existing tests (`npm test` passes 100%).
