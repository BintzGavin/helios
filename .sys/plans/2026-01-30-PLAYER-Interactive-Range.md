# 1. Context & Goal
- **Objective**: Add `I`, `O`, and `X` keyboard shortcuts to `<helios-player>` to set and clear the playback loop range interactively.
- **Trigger**: Vision gap. The "Studio" vision mentions "Timeline scrubber with in/out markers", and while visualization exists, there is no UI/UX to set them in the player.
- **Impact**: Enhances the "In-Browser Preview" experience by allowing developers to easily loop specific sections of their composition without writing code.

# 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Update `handleKeydown` to handle `I`, `O`, `X` keys and implement range logic.
  - `packages/player/src/index.test.ts`: Add test cases for the new keyboard shortcuts.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: To reference the `HeliosController` interface.

# 3. Implementation Spec
- **Architecture**:
  - Extend the existing `handleKeydown` event listener in `HeliosPlayer` Web Component.
  - Use `this.controller.getState()` to retrieve current `playbackRange`, `currentFrame`, `duration`, and `fps`.
  - Use `this.controller.setPlaybackRange(start, end)` to update the loop region.
  - Use `this.controller.clearPlaybackRange()` to reset the loop region.
- **Pseudo-Code**:
  ```typescript
  // Inside handleKeydown switch
  case "i":
  case "I": {
    const s = this.controller.getState();
    const start = Math.floor(s.currentFrame);
    const totalFrames = s.duration * s.fps;
    let end = s.playbackRange ? s.playbackRange[1] : totalFrames;

    if (start >= end) {
       end = totalFrames; // Reset end if invalid
    }
    this.controller.setPlaybackRange(start, end);
    break;
  }
  case "o":
  case "O": {
    const s = this.controller.getState();
    const end = Math.floor(s.currentFrame);
    let start = s.playbackRange ? s.playbackRange[0] : 0;

    if (end <= start) {
       start = 0; // Reset start if invalid
    }
    this.controller.setPlaybackRange(start, end);
    break;
  }
  case "x":
  case "X":
    this.controller.clearPlaybackRange();
    break;
  ```
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New unit tests in `index.test.ts` verify `setPlaybackRange` is called with correct arguments for I/O keys.
  - New unit test verifies `clearPlaybackRange` is called for X key.
  - Existing tests pass.
- **Edge Cases**:
  - `I` pressed when currentFrame >= currentEnd (Resets end).
  - `O` pressed when currentFrame <= currentStart (Resets start).
