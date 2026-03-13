#### 1. Context & Goal
- **Objective**: Improve test coverage for the `KubernetesAdapter` in `packages/infrastructure`.
- **Trigger**: The status log indicates a blocked state because there are no uncompleted implementation plans. The domain has reached gravitational equilibrium for feature implementation, so we are shifting focus to improving test coverage.
- **Impact**: Increased test coverage ensures the `KubernetesAdapter` is robust against various edge cases, such as failing pods, log retrieval errors, and creation failures, improving overall infrastructure reliability.

#### 2. File Inventory
- **Modify**:
  - `packages/infrastructure/tests/adapters/kubernetes-adapter.test.ts` - Add new tests to increase coverage.
  - `docs/status/INFRASTRUCTURE.md` - Update status to reflect completion of test coverage improvements.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/kubernetes-adapter.ts` - Read to understand which branches need coverage.

#### 3. Implementation Spec
- **Architecture**: Expand the existing test suite for `KubernetesAdapter` using Vitest and `vi.mock`.
- **Test Scenarios to Add**:
  - **Failing Job**: Mock `readNamespacedJob` to return a status where `failed` > 0. Verify the adapter returns exit code 1.
  - **Job Creation Failure**: Mock `createNamespacedJob` to reject with an error. Verify the adapter handles the error gracefully and returns exit code 1 with the error message in stderr.
  - **Log Retrieval Failure**: Mock `readNamespacedPodLog` to reject or return empty. Verify the adapter handles the failure without crashing and populates stderr appropriately.
  - **Missing Pods**: Mock `listNamespacedPod` to return no items. Verify the adapter completes without errors but returns empty stdout.
  - **Environment Variables**: Verify that the `env` object passed in the `WorkerJob` is correctly transformed into `k8s.V1EnvVar[]` in the job creation payload.
  - **Options overrides**: Verify that the `kubeconfigPath`, `namespace`, `jobNamePrefix`, and `serviceAccountName` options are correctly passed to the Kubernetes API.
- **Dependencies**: No new dependencies required. Existing Vitest setup will be used.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test && npm run lint`
- **Success Criteria**: All tests pass. `vitest --coverage` (if run locally) would show improved coverage for `kubernetes-adapter.ts`, specifically covering the error handling and edge case branches.
