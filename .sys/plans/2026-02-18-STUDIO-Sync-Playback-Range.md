# STUDIO: Sync Playback Range

#### 1. Context & Goal
- **Objective**: Synchronize the Studio's Timeline In/Out points with the underlying `HeliosController`'s playback range.
- **Trigger**: Currently, the "Client-Side Export" feature in the Renders Panel exports the entire composition duration, ignoring the user's selected timeline range (In/Out points).
- **Impact**: Unlocks the ability for users to export specific sections of their composition directly from the browser (Client-Side), ensuring consistency with the Server-Side render behavior which already respects these points.

#### 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx`
  - Add a `useEffect` hook to call `controller.setPlaybackRange(inPoint, outPoint)` whenever the range changes.
- **Modify**: `packages/studio/src/context/StudioContext.test.tsx`
  - Add a test case to verify `controller.setPlaybackRange` is called when `inPoint`/`outPoint` states update.
- **Read-Only**: `packages/player/src/features/exporter.ts` (Reference for `playbackRange` usage).

#### 3. Implementation Spec
- **Architecture**:
  - The `StudioContext` holds the source of truth for the UI state (`inPoint`, `outPoint`).
  - The `HeliosController` (and underlying `Helios` instance) holds the source of truth for the engine's playback logic and export range.
  - We will bridge these by pushing the UI state to the Controller via a side-effect (`useEffect`).
- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/context/StudioContext.tsx

  // Inside StudioProvider...
  useEffect(() => {
    if (controller) {
      const totalFrames = playerState.duration * playerState.fps;
      // If outPoint is 0, it implies "end of composition"
      const effectiveOut = outPoint > 0 ? outPoint : totalFrames;

      // Sync to controller
      // This allows ClientSideExporter to pick it up via controller.getState().playbackRange
      controller.setPlaybackRange(inPoint, effectiveOut);
    }
  }, [controller, inPoint, outPoint, playerState.duration, playerState.fps]);
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run the updated unit test: `npx vitest run packages/studio/src/context/StudioContext.test.tsx --environment jsdom`
- **Success Criteria**:
  - The new test case "loops playback when currentFrame exceeds outPoint" (existing) and "updates controller playback range" (new) must pass.
- **Edge Cases**:
  - `outPoint` being 0 should translate to `totalFrames` (or handle as "no range" if Helios supports it, but explicit full range is safer for export).
  - Controller being null (handled by check).
