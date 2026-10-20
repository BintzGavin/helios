### 1. Context & Goal
- **Objective**: Improve unit test coverage for `StudioContext.tsx` by writing tests for `exportVideo` and `cancelExport` functions.
- **Trigger**: The recent coverage run shows missing lines 857-886 and 892 in `StudioContext.tsx`, which correspond to the core `exportVideo` and `cancelExport` functionality utilizing `ClientSideExporter`.
- **Impact**: This will increase test coverage, increase stability, and close the gap for core video rendering behaviors in the studio.

### 2. File Inventory
- **Create**: `.sys/plans/2026-10-20-STUDIO-Improve-StudioContext-Export-Coverage.md`
- **Modify**: `packages/studio/src/context/StudioContext.test.tsx`
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`

### 3. Implementation Spec
- **Architecture**: We need to use `vi.mock('@helios-project/player')` to mock the `ClientSideExporter` and intercept its `export` function call in the test suite.
- **Pseudo-Code**:
  - In `StudioContext.test.tsx`, add a mock for `@helios-project/player`. Set up a spy or mock instance for `ClientSideExporter` returning a mocked `export` method.
  - Refactor or enhance the existing `cancels export if controller exists` test. Currently, it fires `ctx.exportVideo` and then `ctx.cancelExport()`, but because `ClientSideExporter` is not properly mocked, the code falls through or fails without awaiting the promise properly or catching the error.
  - Write test: "handles export video correctly". Setup the context. Mock `exporter.export` to resolve. Call `ctx.exportVideo('mp4')`. Wait for it to finish. Verify the mock was called with the correct parameters (format, mode, dimensions).
  - Write test: "handles export video failure". Setup context. Mock `exporter.export` to throw a specific error (e.g. `new Error("Mock export failed")`). Call `ctx.exportVideo('mp4')`. Check if the error toast was triggered with `Mock export failed`.
  - Write test: "cancels export video". Setup context. Mock `exporter.export` to stay pending. Trigger `ctx.exportVideo`. Trigger `ctx.cancelExport`. Check that `abortController.abort()` was invoked on the signal passed to `exporter.export`.
- **Public API Changes**: None
- **Dependencies**: None

### 4. Test Plan
- **Verification**: Run `cd packages/studio && npm run test -- --coverage src/context/StudioContext.test.tsx`
- **Success Criteria**:
  - `exportVideo` code block in `StudioContext.tsx` (lines 857-886, 892) is marked as covered.
  - All tests in `StudioContext.test.tsx` pass without leaking promises or throwing unhandled errors.
- **Edge Cases**:
  - When `renderConfig.videoBitrate` has string units like "1k" or "1m".
  - Catching generic export errors vs "Export aborted".
