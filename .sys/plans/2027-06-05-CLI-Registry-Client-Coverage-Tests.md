#### 1. Context & Goal
- **Objective**: Implement missing test coverage for `packages/cli/src/registry/client.ts`.
- **Trigger**: The CLI package has uncovered lines in `RegistryClient` (lines 32, 85, 90-91, 96-97, 137).
- **Impact**: Full test coverage of registry client ensuring reliability of component caching, fetching and hydration logic in various fallback scenarios.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/cli/src/registry/__tests__/client.test.ts` (Add test cases for missing lines in `RegistryClient` caching, finding, and hydration fallback logic)
- **Read-Only**:
  - `packages/cli/src/registry/client.ts`

#### 3. Implementation Spec
- **Architecture**: Add new `it` blocks within `describe('RegistryClient')` in `client.test.ts`:
  1. For line 32: Test `getComponents(framework)` where `this.cache` is already populated.
  2. For line 85: Test `findComponent(name)` (without framework arg) hitting a multiple-match fallback.
  3. For lines 90-91: Test `findComponent(name)` checking the populated `this.cache`.
  4. For lines 96-97: Test `findComponent(name)` checking the populated `this.remoteCache` (triggering `hydrateComponent`).
  5. For line 137: Test `hydrateComponent` when fetching a specific component file fails and throws an Error.
- **Pseudo-Code**:
  - Add specific tests to seed internal cache (`client['cache']`) and test `getComponents(framework)`.
  - Add specific tests to test file fetch failures throwing the catch block inside the loop.
- **Public API Changes**: None (internal test coverage improvements only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/registry/__tests__/client.test.ts`
- **Success Criteria**: 100% test coverage for `client.ts` in lines, statements, branches, and functions.
- **Edge Cases**: Verify that caching and finding handles `undefined` arguments properly.
