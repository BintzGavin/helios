# 2026-09-09 - STUDIO - Sync Playback Range

#### 1. Context & Goal
- **Objective**: Delegate playback looping and range enforcement to the `HeliosController` (Core/Player) instead of managing it manually in `StudioContext`.
- **Trigger**: Vision Gap - "Client-Side Export" and "Preview" rely on inconsistent manual loop logic in Studio, while Core has native support for `playbackRange` that is ignored.
- **Impact**: Enables native Engine looping (more precise) and ensures Client-Side Export respects the selected range.

#### 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx`
  - Remove manual `useEffect` loop enforcement.
  - Add `useEffect` to sync `inPoint` / `outPoint` to `controller.setPlaybackRange`.
  - Add `useEffect` to sync `loop` state to `controller.setLoop`.
- **Read-Only**: `packages/player/src/controllers.ts` (Reference only).

#### 3. Implementation Spec
- **Architecture**:
  - The `StudioContext` remains the source of truth for the UI (Timeline markers).
  - It synchronizes this state to the `HeliosController` via `useEffect` hooks.
  - The Core/Player engine takes over the responsibility of checking `currentFrame >= end` and seeking to `start`.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/context/StudioContext.tsx

  // Sync Loop State
  useEffect(() => {
    if (controller) {
      controller.setLoop(loop);
    }
  }, [controller, loop]);

  // Sync Playback Range
  useEffect(() => {
    if (!controller) return;

    const { duration, fps } = playerState;
    // Default handling: if outPoint is 0, treat as full duration
    const maxFrame = Math.floor(duration * fps);
    const effectiveOut = outPoint === 0 ? maxFrame : outPoint;

    // If range is full video (or invalid), clear it
    if (inPoint === 0 && (outPoint === 0 || effectiveOut >= maxFrame)) {
        controller.clearPlaybackRange();
    } else {
        // Otherwise set strict range
        controller.setPlaybackRange(inPoint, effectiveOut);
    }
  }, [controller, inPoint, outPoint, playerState.duration, playerState.fps]);

  // REMOVE: The old useEffect that manually checked currentFrame >= loopEnd
  ```

- **Public API Changes**: None.
- **Dependencies**: `HeliosController.setPlaybackRange` (Verified present in Player).

#### 4. Test Plan
- **Verification**: `npx helios studio` (manual verification)
- **Success Criteria**:
  - Open Studio, set In/Out points.
  - Enable Loop. Playback should loop at Out point.
  - Client-Side Export (if supported by Player) should theoretically now respect range (though verifying this specifically requires Player internals, the Studio side is now correct).
- **Edge Cases**:
  - `outPoint` = 0 (should default to full duration).
  - `inPoint` > `outPoint` (should be handled by Timeline logic to prevent, but Controller should be safe).
