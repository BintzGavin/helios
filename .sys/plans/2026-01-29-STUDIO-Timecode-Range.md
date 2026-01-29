#### 1. Context & Goal
- **Objective**: Implement professional SMPTE timecode display and strict playback range enforcement in the Studio UI.
- **Trigger**: The current "Timeline Scrubber" lacks functional enforcement of In/Out points during looping/rewinding and uses a non-standard time format (`M:SS.ms`), creating a gap between the vision of a "Professional Video Tool" and reality.
- **Impact**: Improves usability for professionals by using standard timecode (`HH:MM:SS:FF`) and ensures the "Work Area" (In/Out range) behaves as expected during playback loops and navigation.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Update time display logic)
- **Modify**: `packages/studio/src/App.tsx` (Update loop enforcement logic)
- **Modify**: `packages/studio/src/components/Controls/PlaybackControls.tsx` (Update Rewind button behavior)
- **Modify**: `packages/studio/src/components/GlobalShortcuts.tsx` (Update Home key behavior)
- **Read-Only**: `packages/core/src/timecode.ts` (Reference for utility)

#### 3. Implementation Spec

**Architecture:**
- Use `@helios-project/core`'s `framesToTimecode` utility for standardized display.
- Enforce client-side loop logic in `App.tsx` (as `HeliosController` bridge does not yet expose `setPlaybackRange` API from core).
- Update navigation controls to respect `StudioContext`'s `inPoint`.

**Pseudo-Code / Logic:**

**1. `packages/studio/src/components/Timeline.tsx`**
- Import `framesToTimecode` from `@helios-project/core`.
- Replace local `formatTime` function:
  ```typescript
  const formatTime = (frame: number, fps: number) => {
    if (!fps || fps <= 0) return "00:00:00:00";
    return framesToTimecode(frame, fps);
  };
  ```
- This will automatically update the current time and duration labels in the header.

**2. `packages/studio/src/App.tsx`**
- In the `loop` logic `useEffect`:
  - Check if `loop` is active.
  - If `isPlaying` is true:
    - Define `loopEnd` as `outPoint > 0 ? outPoint : totalFrames`.
    - If `currentFrame >= loopEnd - 1`:
      - Seek to `inPoint`.
      - Ensure `controller.play()` is called (to keep playing).

**3. `packages/studio/src/components/Controls/PlaybackControls.tsx`**
- In `handleRewind`:
  - Change `controller.seek(0)` to `controller.seek(inPoint)`.
  - This ensures "Rewind" goes to the start of the user-defined work area.

**4. `packages/studio/src/components/GlobalShortcuts.tsx`**
- In `Home` shortcut handler:
  - Change `controller.seek(0)` to `controller.seek(inPoint)`.

**Public API Changes**:
- None.

**Dependencies**:
- None.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - **Timecode**: Verify the timeline header shows `HH:MM:SS:FF` format (e.g., `00:00:05:12`).
  - **Looping**:
    - Set In Point to frame 30 (`I`).
    - Set Out Point to frame 60 (`O`).
    - Enable Loop (`L` or button).
    - Play. Verify playback jumps from 60 back to 30.
  - **Navigation**:
    - Press `Home` key. Verify playhead jumps to frame 30 (In Point).
    - Click Rewind button. Verify playhead jumps to frame 30 (In Point).
  - **Edge Cases**:
    - Set In Point to 0, Out Point to Max (Default). Verify normal behavior.
    - Test with FPS = 0 (should show safe "00:00:00:00" string without crashing).
- **Success Criteria**:
  - Timecode is correctly formatted.
  - Playback stays within defined range when looping.
  - Rewind/Home respect the defined range start.
