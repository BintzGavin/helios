# 2026-10-29-PLAYER-Async-Seek.md

#### 1. Context & Goal
- **Objective**: Update `DirectController.seek` to wait for visual frame rendering (via double `requestAnimationFrame`) before resolving its Promise.
- **Trigger**: Inconsistency between `DirectController` (synchronous resolve) and `BridgeController` (waits for frame), causing premature `seeked` events and race conditions in Direct Mode.
- **Impact**: Ensures Standard Media API compliance (seeking state persists until frame update) and fixes visual glitches/race conditions when capturing frames or scrubbing in Direct Mode.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Implement async seek logic)
- **Modify**: `packages/player/src/controllers.test.ts` (Update tests to verify RAF usage)
- **Read-Only**: `packages/player/src/index.ts` (For context on how `seek` is called)

#### 3. Implementation Spec
- **Architecture**:
  - `DirectController` wraps the `Helios` instance directly (same-origin).
  - Currently, `seek` returns `Promise.resolve()` immediately after calling `helios.seek()`.
  - The fix will wrap the resolution in a double `requestAnimationFrame` loop using the iframe's window (or global window fallback).
- **Pseudo-Code**:
  ```typescript
  seek(frame: number): Promise<void> {
    this.instance.seek(frame);
    return new Promise(resolve => {
      const win = this.iframe?.contentWindow || window;
      win.requestAnimationFrame(() => {
        win.requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test` in `packages/player`.
- **Success Criteria**:
  - `DirectController` tests pass.
  - New assertions confirm `requestAnimationFrame` is called exactly twice during a seek operation.
- **Edge Cases**:
  - Ensure fallback to `window` if `iframe.contentWindow` is null (though unlikely in `DirectController` usage).
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
