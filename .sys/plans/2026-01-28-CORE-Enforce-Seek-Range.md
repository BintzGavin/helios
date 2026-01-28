# 2026-01-28-CORE-Enforce-Seek-Range.md

#### 1. Context & Goal
- **Objective**: Update `Helios.seek()` to respect the active `playbackRange` (if set), ensuring the current frame remains within the designated start and end frames.
- **Trigger**: Bug/Gap. The `playbackRange` feature (used for looping sections or distributed rendering chunks) is currently ignored by the explicit `seek()` method, allowing the engine to step out of bounds.
- **Impact**: Ensures correctness for distributed rendering (where a worker must stay within its chunk) and improves the timeline preview experience (scrubbing constrained to loop region).

#### 2. File Inventory
- **Modify**: `packages/core/src/helios.ts` (Add clamping logic to `seek`)
- **Modify**: `packages/core/src/index.test.ts` (Add verification test case)

#### 3. Implementation Spec
- **Architecture**: Constraint Logic. The `seek` method acts as the gatekeeper for `_currentFrame`, applying constraints from `_playbackRange` before updating the signal.
- **Pseudo-Code**:
```typescript
  public seek(frame: number) {
    const range = this._playbackRange.peek();
    const totalFrames = this.duration * this.fps;

    let min = 0;
    let max = totalFrames;

    if (range) {
      min = Math.max(0, range[0]); // Ensure we don't clamp below 0 even if range is weird (though validated elsewhere)
      max = Math.min(totalFrames, range[1]);
    }

    // Standard clamping + Range clamping
    const newFrame = Math.max(min, Math.min(frame, max));

    this._currentFrame.value = newFrame;

    // ... update driver (existing code) ...
  }
```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `packages/core/src/index.test.ts` passes.
  - New test case `should clamp seek to playbackRange` confirms:
    - Setting range `[10, 20]`.
    - `seek(5)` results in frame `10`.
    - `seek(25)` results in frame `20`.
    - `seek(15)` results in frame `15`.
  - Clearing range restores full seek access.
- **Edge Cases**:
  - Range is null (default behavior).
  - Range is equal to duration.
  - Seek exactly to boundaries.
