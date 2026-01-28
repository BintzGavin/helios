# Context & Goal
- **Objective**: Implement standard video player keyboard shortcuts (`M`, `C`, `Home`, `End`, `0-9`) in `<helios-player>`.
- **Trigger**: Vision gap in "UI controls" - current player lacks standard shortcuts found in major video platforms (e.g., YouTube), reducing usability.
- **Impact**: Improves accessibility and developer experience by providing expected navigation and control shortcuts.

# File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `handleKeydown` logic)
- **Modify**: `packages/player/src/index.test.ts` (Add test cases for new shortcuts)
- **Read-Only**: `packages/player/src/controllers.ts` (To verify controller API)

# Implementation Spec
- **Architecture**: Extend the existing `handleKeydown` event listener in `HeliosPlayer` Web Component.
- **Pseudo-Code**:
  ```typescript
  handleKeydown(e) {
    // ... existing checks ...
    switch (e.key) {
      // Existing cases...
      case 'm':
      case 'M':
        toggleMute();
        break;
      case 'c':
      case 'C':
        toggleCaptions();
        break;
      case 'Home':
        seek(0);
        preventDefault();
        break;
      case 'End':
        seek(duration * fps);
        preventDefault();
        break;
      case '0' ... '9':
        seek((parseInt(key) / 10) * duration * fps);
        preventDefault(); // Optional, but good for safety
        break;
    }
  }
  ```
- **Public API Changes**: None (Internal behavior update).
- **Dependencies**: None.

# Test Plan
- **Verification**: Run `npm test -w packages/player`.
- **Success Criteria**:
  - `M` key toggles mute state.
  - `C` key toggles captions.
  - `Home` seeks to frame 0.
  - `End` seeks to last frame.
  - `5` seeks to 50% of duration.
  - Existing tests (Space, K, F, Arrows) continue to pass.
- **Edge Cases**:
  - Seeking with number keys when duration is 0 (should handle gracefully).
  - Pressing keys when controls are disabled/locked (should be ignored).
