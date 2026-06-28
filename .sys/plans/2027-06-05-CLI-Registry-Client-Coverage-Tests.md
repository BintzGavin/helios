#### 1. Context & Goal
- **Objective**: Improve test coverage for the `RegistryClient` in `packages/cli/src/registry/client.ts` to 100%.
- **Trigger**: Coverage report indicates lines `32, 85, 90-91, 96-97, 137` are uncovered.
- **Impact**: Ensures robust handling of caching, fallbacks, and remote file fetching in the CLI registry integration.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/registry/__tests__/client.test.ts` (Add tests for missing branches)
- **Read-Only**: `packages/cli/src/registry/client.ts`

#### 3. Implementation Spec
- **Architecture**: Use Vitest and `vi.stubGlobal('fetch', ...)` to simulate various cache and network states to hit uncovered branches.
- **Lines to Cover**:
  - `32`: Early return from cache with and without framework filter (`if (this.cache) ...`) when calling `getComponents`.
  - `85`: `findInList` returning the first match if no framework filter is passed but matches exist.
  - `90-91`: `findComponent` hitting `this.cache` and finding a match via `findInList` (cache hit early return).
  - `96-97`: `findComponent` hitting `this.remoteCache` and finding a match via `findInList` (remote cache hit early return + hydrate).
  - `137`: Catch block in `hydrateComponent` when fetching a specific file from the remote registry throws an error or returns a non-ok status.
- **Pseudo-Code**:
  - Add test: Pre-populate `this.cache` by calling `getComponents`, then call `getComponents` again with and without framework filter to hit line 32.
  - Add test: Pre-populate `this.cache`, then call `findComponent(name)` without a framework to hit lines 85 and 90-91.
  - Add test: Pre-populate `this.remoteCache`, then call `findComponent(name)` to hit lines 96-97.
  - Add test: Pre-populate `this.remoteCache`, call `findComponent(name)`, but mock `fetch` to throw an error for the individual file fetch to hit line 137.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/registry/__tests__/client.test.ts`
- **Success Criteria**: 100% line, branch, and function coverage for `src/registry/client.ts`.
- **Edge Cases**: Ensure `fetch` mocks reset correctly between tests.
