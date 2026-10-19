#### 1. Context & Goal
- **Objective:** Add unit tests to cover `StudioContext.tsx` lines 857-886, 892 which deal with `exportVideo` and `cancelExport` functions.
- **Trigger:** Coverage report showed these lines missing test coverage.
- **Impact:** 100% code coverage for `StudioContext.tsx` which is critical for context management reliability in Studio.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/studio/src/context/StudioContext.test.tsx` (Add mock for `ClientSideExporter` and add test blocks for `exportVideo` testing success, bitrate parsing logic, exporter errors, and `cancelExport`).
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx` (reference file for the logic to cover).

#### 3. Implementation Spec
- **Architecture:** We will use Vitest mocking capabilities. We need to mock `@helios-project/player`'s `ClientSideExporter` because `exportVideo` creates a `new ClientSideExporter()`.
- **Pseudo-Code:**
  - Mock `@helios-project/player`: `vi.mock('@helios-project/player', () => ({ ClientSideExporter: vi.fn() }))`
  - Inside `beforeEach`, set up the `ClientSideExporter` mock to have an `export` function.
  - Test: `exports video successfully with bitrate parsing`
    - Setup `renderConfig` with `videoBitrate: '5M'`
    - Call `exportVideo('mp4')`
    - Assert `ClientSideExporter.export` was called with `{ bitrate: 5000000, ... }`
    - Assert `setExportProgress` was called if we trigger `onProgress` callback
  - Test: `handles export video failure`
    - Mock `ClientSideExporter.export` to throw a specific error ("Test export error")
    - Call `exportVideo('mp4')`
    - Assert that error handling is triggered.
  - Modify `cancels export if controller exists` test to assert `cancelExport()` calls `abort()` on the `exportAbortControllerRef.current` (by spying on `AbortController.prototype.abort`).
- **Public API Changes:** None
- **Dependencies:** None

#### 4. Test Plan
- **Verification:** Run `npm run test -w packages/studio -- --coverage`
- **Success Criteria:** `StudioContext.tsx` reaches 100% branch and line coverage (specifically lines 857-886, 892 are covered).
- **Edge Cases:** Different bitrate strings like "5K", "10", handles generic export error.
