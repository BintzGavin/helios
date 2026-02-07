# 2025-02-12-PLAYER-ResizeEvent

#### 1. Context & Goal
- **Objective**: Implement the standard `resize` event in `<helios-player>` to notify when the composition's intrinsic dimensions change.
- **Trigger**: Standard Media API parity gap. `HTMLVideoElement` fires `resize` when `videoWidth`/`videoHeight` changes, but `<helios-player>` currently does not.
- **Impact**: Enables host applications (like Studio) to reactively resize the player container or update UI layouts when the composition size changes dynamically.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement event dispatch logic in `updateUI`)
- **Modify**: `packages/player/src/api_parity.test.ts` (Add verification test)

#### 3. Implementation Spec
- **Architecture**: Extend the `updateUI` method in `HeliosPlayer` to compare current `width`/`height` from state with `lastState`.
- **Logic**:
  ```typescript
  // Inside updateUI(state), BEFORE `this.lastState = state;`
  if (this.lastState) {
    const widthChanged = state.width !== this.lastState.width;
    const heightChanged = state.height !== this.lastState.height;
    if (widthChanged || heightChanged) {
      this.dispatchEvent(new Event("resize"));
    }
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test packages/player/src/api_parity.test.ts`
- **Success Criteria**: New test case "should dispatch resize event when dimensions change" passes.
- **Edge Cases**: Ensure event fires only when dimensions *actually* change (not on every frame update).
