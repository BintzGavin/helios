# Context & Goal
- **Objective**: Implement Hot Reloading (HMR) state preservation for the Studio preview player.
- **Trigger**: Vision Gap - "Instant preview updates" (README). Currently, HMR resets the player to frame 0, disrupting the development flow.
- **Impact**: Significantly improves Developer Experience (DX) by maintaining context (frame, playback state) when editing composition code. Fixes a bug where `Stage` holds a stale controller reference after HMR.

# File Inventory
- **Modify**: `packages/studio/src/components/Stage/Stage.tsx`
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`

# Implementation Spec
- **Architecture**:
  - The `Stage` component currently stops checking for the controller once it finds it. This prevents it from detecting when the underlying iframe reloads (HMR) and creates a new controller.
  - We will implement a continuous check (polling) in `Stage.tsx` to detect when the `helios-player` web component returns a *different* controller instance.
  - We will use a `useRef` to track the "last known good state" (`frame`, `isPlaying`, `src`).
  - When a controller change is detected, if the `src` matches the last known state (indicating a reload, not a navigation), we will restore the frame and playback status.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/components/Stage/Stage.tsx

  // 1. Import playerState from context
  const { setController, canvasSize, setCanvasSize, playerState, controller } = useStudio();

  // 2. Add ref to track history
  const lastStateRef = useRef({ frame: 0, isPlaying: false, src: '' });

  // 3. Update history when state changes (and controller is valid)
  useEffect(() => {
    if (controller && src) {
      lastStateRef.current = {
        frame: playerState.currentFrame,
        isPlaying: playerState.isPlaying,
        src: src
      };
    }
  }, [playerState.currentFrame, playerState.isPlaying, src, controller]);

  // 4. Modify the controller connection effect
  useEffect(() => {
    const el = playerRef.current;
    if (!el || !src) return;

    // Remove the 'clearInterval' logic so it keeps polling
    const interval = setInterval(() => {
      const freshCtrl = el.getController();

      // Check if controller has changed (reference inequality)
      // This handles:
      // a) Initial load (null -> ctrl)
      // b) HMR Reload (ctrlA -> null -> ctrlB) or (ctrlA -> ctrlB)
      if (freshCtrl !== controller) {
        setController(freshCtrl);

        // If we found a new controller, check if we should restore state
        if (freshCtrl && lastStateRef.current.src === src) {
           // Restore state
           const { frame, isPlaying } = lastStateRef.current;
           if (frame > 0) freshCtrl.seek(frame);
           if (isPlaying) freshCtrl.play();
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [src, controller, setController]); // Dependencies crucial here
  ```

- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npm run build` in the root (or `packages/studio`) to ensure TypeScript compiles the new logic correctly.
- **Success Criteria**:
  - `Stage.tsx` compiles without errors.
  - Logic correctly handles the cleanup of the interval.
- **Edge Cases**:
  - **Composition Switch**: When `src` changes, `lastStateRef.current.src` will not match, so restoration will correctly *not* happen.
  - **Initial Load**: `lastStateRef` starts with frame 0, so restoration (seek 0) is harmless/noop.
  - **Rapid HMR**: Polling at 200ms should be sufficient for human perception of "instant", but avoids hammering the DOM.
