# 2025-02-18-PLAYER-standardize-shortcuts.md

#### 1. Context & Goal
- **Objective**: Standardize keyboard shortcuts for seeking to align with industry conventions (YouTube, VLC) while preserving frame-level precision for professional use.
- **Trigger**: Critical learning in `.jules/PLAYER.md` identifying non-standard shortcuts (Arrows = 1 frame) as a UX friction point.
- **Impact**: Improves usability for long-form review, aligns with user expectations, and adds automated verification for keyboard interactions.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `handleKeydown` logic and `renderShortcuts` help text)
- **Modify**: `packages/player/README.md` (Update Shortcuts documentation table)
- **Modify**: `tests/e2e/verify-player.ts` (Add automated tests for keyboard shortcuts)

#### 3. Implementation Spec
- **Architecture**: Update the `handleKeydown` event listener in `HeliosPlayer` class to use time-based seeking for Arrow keys instead of frame-based seeking.
- **Pseudo-Code**:
  ```typescript
  // In handleKeydown switch(e.key):

  case "ArrowRight":
    // Seek forward 5 seconds
    seekRelative(5 * fps);
    break;

  case "ArrowLeft":
    // Seek backward 5 seconds
    seekRelative(-5 * fps);
    break;

  case "Shift + ArrowRight": (logic)
    // Seek forward 10 seconds
    seekRelative(10 * fps);
    break;

  case "Shift + ArrowLeft": (logic)
    // Seek backward 10 seconds
    seekRelative(-10 * fps);
    break;

  case "j":
  case "J":
    // Seek backward 10 seconds
    seekRelative(-10 * fps);
    break;

  case "l":
  case "L":
    // Seek forward 10 seconds
    seekRelative(10 * fps);
    break;

  case ".":
    // Seek forward 1 frame
    seekRelative(1);
    break;

  case ",":
    // Seek backward 1 frame
    seekRelative(-1);
    break;
  ```
- **Public API Changes**: No changes to the Component API (attributes/methods). This is strictly UI behavior.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx tests/e2e/verify-player.ts`
- **Success Criteria**:
  - Automated test confirms `ArrowRight` advances playhead by approximately 5 seconds.
  - Automated test confirms `.` advances playhead by 1 frame.
  - Existing tests (Playback, Scrubber, Menu) pass without regression.
- **Edge Cases**:
  - Seeking past end (should clamp).
  - Seeking before start (should clamp to 0).
