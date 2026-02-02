# 📋 CORE-Binding-Offsets: Enhanced Timeline Composition

## 1. Context & Goal
- **Objective**: Enhance `Helios.bindTo()` to support `offset` and `scale` parameters, enabling advanced composition (Sequencing, Series) of Helios instances.
- **Trigger**: Vision Gap - "Sequence/Series" support is marked as "Not yet" implemented in the comparison table, although `sequencing.ts` utilities exist.
- **Impact**: Unlocks the ability to easily chain and compose multiple independent Helios timelines (e.g., Intro -> Scene 1 -> Scene 2 -> Outro) without writing manual glue code.

## 2. File Inventory
- **Create**: `packages/core/src/binding.test.ts` (New test file for binding logic)
- **Modify**: `packages/core/src/Helios.ts` (Update `bindTo` signature and logic)
- **Read-Only**: `packages/core/src/sequencing.ts` (Reference for usage patterns)

## 3. Implementation Spec
- **Architecture**: Extend the Observer/Signal pattern used in `bindTo` to include transformation logic (affine transformation of time).
- **Public API Changes**:
  - Update `Helios.bindTo` signature:
    ```typescript
    interface BindOptions {
      offset?: number; // Time on MASTER when CHILD is at 0 (ChildTime = MasterTime - offset)
      scale?: number; // Time scaling factor (ChildTime = (MasterTime - offset) * scale)
    }
    public bindTo(master: Helios<any>, options?: BindOptions): void
    ```
- **Pseudo-Code**:
  ```typescript
  // In Helios.ts
  public bindTo(master: Helios<any>, options?: BindOptions) {
      // 1. Cleanup existing bindings (disposeSync, unbindFromDocumentTimeline, stop ticker)
      // 2. Parse options (default offset=0, scale=1)
      // 3. Create effect:
      //    currentFrame.value = ((master.currentTime.value - offset) * scale) * fps
      //    isPlaying.value = master.isPlaying.value
      //    playbackRate.value = master.playbackRate.value * scale
      //    driver.update(...)
  }
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core packages/core/src/binding.test.ts`
- **Success Criteria**:
  - **Offset**: Binding with offset 5s means at Master T=6s, Child is at T=1s.
  - **Scale**: Binding with scale 2x means at Master T=1s, Child is at T=2s.
  - **Combined**: Binding with offset 5s, scale 2x. Master T=6s -> Child T=(6-5)*2 = 2s.
  - **Playback Rate**: Master rate 1 -> Child rate `scale`.
- **Edge Cases**:
  - Negative time (before offset) -> Child frame becomes negative (expected).
  - Negative scale (reverse playback) -> Child runs backwards relative to Master.
  - Unbinding restores control (existing behavior).
