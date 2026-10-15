#### 1. Context & Goal
- **Objective**: Improve unit test coverage for `StudioContext.tsx` in `packages/studio`.
- **Trigger**: Address untested lines and branches in `StudioContext.tsx` related to asset, composition, and job management functions.
- **Impact**: Increases test confidence in the core application state and data fetching layer.

#### 2. File Inventory
- **Create**: None.
- **Modify**: `packages/studio/src/context/StudioContext.test.tsx`
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`

#### 3. Implementation Spec
- **Architecture**: We will extend the existing `StudioContext.test.tsx` test suite. The `StudioContext.tsx` file defines numerous functions for interacting with the backend (`fetch` API), such as `uploadAsset`, `deleteAsset`, `renameAsset`, `moveAsset`, `createFolder`, `createComposition`, `duplicateComposition`, `updateCompositionMetadata`, `updateThumbnail`, `deleteComposition`, `startRender`, `cancelRender`, `deleteRender`. Most of these are completely uncovered in the current test suite.
- **Pseudo-Code**:
  - Open `packages/studio/src/context/StudioContext.test.tsx`.
  - Add describe blocks for 'asset operations', 'composition operations', and 'render job operations'.
  - In each describe block, iterate through the relevant API methods and add 2-3 tests for each:
    - **Success case**: Mock `mockFetch.mockResolvedValueOnce({ ok: true, json: ... })`, call the function inside `act()`, assert `fetch` was called with correct arguments, and verify success path execution (e.g. `addToast` called).
    - **Server error case**: Mock `mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Server Error' }) })`, call the function, assert failure path (error thrown or toast shown).
    - **Network/Exception case**: Mock `mockFetch.mockRejectedValueOnce(new Error('Network error'))`, call the function, assert catch block is executed correctly.
  - Specifically ensure testing `exportVideo` edge cases (already partially tested but needs complete coverage).
  - Add tests for UI state toggles (`setOmnibarOpen`, `setSettingsOpen`, `setDiagnosticsOpen`, etc) which are currently untested.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- src/context/StudioContext.test.tsx --coverage`
- **Success Criteria**: Line coverage of `StudioContext.tsx` reaches 100%.
- **Edge Cases**: Ensure `act()` wrapping is used appropriately to avoid React state update warnings during asynchronous context changes. Ensure `console.error` is mocked or suppressed during intentional failure tests if necessary.
