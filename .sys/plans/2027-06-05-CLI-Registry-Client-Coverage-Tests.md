#### 1. Context & Goal
- **Objective**: Implement missing test coverage for `RegistryClient` in `@helios-project/cli` to achieve 100% code coverage.
- **Trigger**: Backlog item to complete CLI test suite and ensure registry client robustness.
- **Impact**: Ensures that `RegistryClient` behaves correctly under various edge cases (like network timeouts, missing caches, empty responses, hydration errors), improving reliability and maintaining code quality standards.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/registry/__tests__/client.test.ts` (Add test cases to cover the uncovered branches in `client.ts`)
- **Read-Only**: `packages/cli/src/registry/client.ts`

#### 3. Implementation Spec
- **Architecture**: We need to write unit tests for `RegistryClient` that explicitly trigger the uncovered lines identified in the coverage report:
    - `setTimeout` callback in `fetch` (`controller.abort()`).
    - The `framework` conditional when returning cached data.
    - `findInList` returning `undefined` when `matches.length === 0`.
    - `findInList` returning `matches[0]` when `framework` is undefined.
    - The `if (found)` branch for `this.cache` inside `findComponent`.
    - The `if (found)` branch for `this.remoteCache` inside `findComponent`.
    - `!res.ok` condition during `hydrateComponent` throwing an error.
    - The `catch (e)` block in `hydrateComponent` throwing an error.
- **Pseudo-Code**:
  - Mock `fetch` or `setTimeout` and `AbortController` to test the timeout.
  - Test `getComponents` returning cached data with framework defined to test `this.cache.filter`.
  - Call `findComponent` with a name that doesn't exist to test `matches.length === 0`.
  - Call `findComponent` without passing `framework` to test returning `matches[0]`.
  - Setup `this.cache` (e.g. by a first call) and then call `findComponent` where `findInList(this.cache)` finds a match.
  - Setup `this.remoteCache` and then call `findComponent` where it finds a match.
  - Mock `fetch` to return `res.ok = false` when fetching a file in `hydrateComponent` to test `throw new Error("Status ...")`.
  - Mock `fetch` to throw a network error when fetching a file in `hydrateComponent` to test the `catch` block.
- **Public API Changes**: None (internal test coverage improvements only).
- **Dependencies**: The `packages/cli` workspace.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage`.
- **Success Criteria**: 100% test coverage for `packages/cli/src/registry/client.ts`.
- **Edge Cases**: Ensure the test for the `setTimeout` callback doesn't actually wait 5 seconds (we can mock `global.setTimeout` or use Vitest's fake timers).
