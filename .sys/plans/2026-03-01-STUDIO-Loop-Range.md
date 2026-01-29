# Context & Goal
- **Objective**: Implement logic to loop playback within the defined In/Out points when the "Loop" toggle is enabled.
- **Trigger**: Vision gap in "Timeline scrubber with in/out markers to define render ranges" - the editor should respect these ranges during playback.
- **Impact**: Improves the editing workflow by allowing users to preview specific sections of the composition repeatedly. This bridges the gap between defining a render range and visualizing it.

# File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Move and enhance loop logic here)
- **Modify**: `packages/studio/src/App.tsx` (Remove legacy loop logic)
- **Read-Only**: `packages/studio/src/components/Timeline/Timeline.tsx` (Reference for point clamping)

# Implementation Spec
- **Architecture**: Move the loop enforcement logic from the UI layer (`App.tsx`) to the State layer (`StudioContext`). This ensures that the loop behavior is consistent regardless of which component is rendering the UI.
- **Pseudo-Code**:
  ```typescript
  // In StudioContext.tsx
  useEffect(() => {
    if (!controller || !loop || !playerState.isPlaying) return;

    const { currentFrame, duration, fps } = playerState;
    const totalFrames = duration * fps;

    // Determine loop boundaries
    const start = inPoint;
    const end = outPoint > 0 ? outPoint : totalFrames;

    // Check if we passed the end
    // Use a threshold (e.g., end - 1) to catch it before it stops
    if (currentFrame >= end - 1) {
      // Seek to start
      controller.seek(start);
      // Ensure it keeps playing (seek might pause in some implementations, though Helios shouldn't)
      controller.play();
    }
  }, [currentFrame, loop, inPoint, outPoint, isPlaying, controller]); // Check dependencies
  ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Note**: This is a client-side implementation in Studio. While `Helios` core supports `playbackRange`, the `HeliosController` bridge in `packages/player` does not yet expose it. This solution provides immediate value without blocking on `player` package updates.

# Test Plan
- **Verification**:
  1. Start Studio: `npx helios studio`
  2. Load a composition.
  3. Set In Point to 30 frames (drag marker or use 'I').
  4. Set Out Point to 60 frames (drag marker or use 'O').
  5. Enable Loop (Click loop button or press 'L').
  6. Play the video.
- **Success Criteria**:
  - Playback loops from frame ~60 back to frame 30.
  - Playback does not loop at the end of the video (unless Out Point is at end).
  - Playback continues smoothly after looping.
- **Edge Cases**:
  - `outPoint` defaults to 0 (should loop at total frames).
  - `inPoint` set to 0 (should loop to start).
  - User manually seeks outside the range while playing (should continue playing until end of range, then loop back to inPoint).
