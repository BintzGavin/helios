# 2026-02-18-STUDIO-Hot-Reload-State.md

## 1. Context & Goal
- **Objective**: Implement state preservation (current frame, playback status) for the Studio player during Hot Module Replacement (HMR) reloads.
- **Trigger**: Vision Gap - "Hot Reloading" requires maintaining context when the user edits their composition, rather than resetting to frame 0.
- **Impact**: Significantly improves developer experience by allowing users to tweak animations at a specific timestamp without constantly scrubbing back to the point of interest.

## 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/components/Stage/Stage.tsx`: Add polling logic to detect controller replacement and restore state.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`: To understand `playerState` structure.
  - `packages/studio/src/App.tsx`: To ensure no conflicting subscription logic.

## 3. Implementation Spec
- **Architecture**:
  - The `Stage` component will upgrade its controller detection mechanism from a one-time check to a continuous polling interval (e.g., 100ms).
  - It will track the `knownController` identity.
  - When the controller identity changes (indicating an iframe reload/HMR) *and* the source URL has not changed, the component will trigger a "State Restoration" routine.
- **Pseudo-Code (Stage.tsx)**:
  ```typescript
  // Inside Stage component
  const { setController, playerState } = useStudio();
  const playerStateRef = useRef(playerState); // Keep fresh without re-running effects
  playerStateRef.current = playerState;
  const knownControllerRef = useRef(null);

  // Reset known controller when SRC changes (composition switch)
  useEffect(() => {
    knownControllerRef.current = null;
    setController(null);
  }, [src]);

  // Polling Effect
  useEffect(() => {
    const el = playerRef.current;
    if (!el || !src) return;

    const interval = setInterval(() => {
       const newCtrl = el.getController();
       if (newCtrl !== knownControllerRef.current) {
          // Detect HMR (Change occurred but src didn't change/reset us)
          if (knownControllerRef.current && newCtrl) {
             // Restore State from ref
             const { currentFrame, isPlaying } = playerStateRef.current;
             try {
                newCtrl.seek(currentFrame);
                if (isPlaying) newCtrl.play();
             } catch (e) {
                console.warn("Failed to restore state", e);
             }
          }
          knownControllerRef.current = newCtrl;
          setController(newCtrl);
       }
    }, 100);
    return () => clearInterval(interval);
  }, [src, setController]); // Dependencies
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Open an example composition.
  3. Scrub to frame 50.
  4. Edit the composition source code (e.g., change a color or size).
  5. Save the file to trigger HMR.
  6. Verify that after the preview updates, the player is still at frame 50 (not reset to 0).
- **Success Criteria**: Playback position and playing state are preserved across HMR updates.
- **Edge Cases**:
  - Switching compositions should NOT restore state (should reset to 0).
  - First load should start at 0 (or default).
  - Rapid HMR updates should not cause race conditions.
