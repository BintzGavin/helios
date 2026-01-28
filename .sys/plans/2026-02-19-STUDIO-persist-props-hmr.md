# Plan: Persist Input Props on Hot Reload

## 1. Context & Goal
- **Objective**: Ensure that `inputProps` modified in the Studio Props Editor are preserved when the Helios Controller reloads due to Hot Module Replacement (HMR).
- **Trigger**: Currently, editing a composition's code triggers a reload that resets all props to their default values, discarding any adjustments made by the user in the Props Editor. This breaks the "tweak-code-tweak" feedback loop.
- **Impact**: Improves the "Hot Reloading" experience by maintaining user state (props) alongside playback position and status, making the Studio a more robust development environment.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/Stage/Stage.tsx`
  - Update state tracking to include `inputProps`.
  - Apply preserved `inputProps` to the new controller upon reconnection.

## 3. Implementation Spec
- **Architecture**:
  - The `Stage` component already maintains a `lastStateRef` to track `frame` and `isPlaying` for HMR restoration.
  - We will extend this reference to store `inputProps` from `playerState`.
  - When a new controller instance is detected (indicating a reload/HMR event) AND the composition source URL matches the previous one:
    1. Retrieve `inputProps` from `lastStateRef`.
    2. Call `freshCtrl.setInputProps(inputProps)` *before* restoring playback state.
    3. Proceed with seeking and playing.
- **Pseudo-Code**:
  ```typescript
  // In Stage.tsx

  // Update ref type/init
  const lastStateRef = useRef({ frame: 0, isPlaying: false, src: '', inputProps: {} });

  // Update tracking effect
  useEffect(() => {
    if (controller && src) {
      lastStateRef.current = {
        frame: playerState.currentFrame,
        isPlaying: playerState.isPlaying,
        src: src,
        inputProps: playerState.inputProps // Capture props
      };
    }
  }, [playerState, src, controller]);

  // Update restoration logic
  // Inside setInterval check:
  if (freshCtrl && freshCtrl !== controller) {
    if (lastStateRef.current.src === src) {
       const { frame, isPlaying, inputProps } = lastStateRef.current;
       try {
         // Restore props first so the frame renders correctly
         if (inputProps) freshCtrl.setInputProps(inputProps);
         if (frame > 0) freshCtrl.seek(frame);
         if (isPlaying) freshCtrl.play();
       } catch (e) { ... }
    }
    setController(freshCtrl);
  }
  ```

## 4. Test Plan
- **Verification**:
  - Run `npm run verify` in `packages/studio` to ensure the Studio environment and UI components still verify correctly.
  - Manual verification:
    1. Start Studio: `npm run dev`.
    2. Open a composition with input props.
    3. Modify a prop in the Props Editor.
    4. Edit the composition source code to trigger HMR.
    5. Verify the prop value persists.
