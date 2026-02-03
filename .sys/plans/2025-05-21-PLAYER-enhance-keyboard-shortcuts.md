# Plan: Enhance Keyboard Shortcuts for Helios Player

## 1. Context & Goal
- **Objective**: Implement standard video player keyboard shortcuts (`c`, `0`-`9`, `Home`, `End`) in `<helios-player>`.
- **Trigger**: The current keyboard support covers basic playback but lacks standard shortcuts found in major video platforms (e.g., YouTube), specifically for caption toggling and percentage-based seeking.
- **Impact**: Improves the "In-Browser Preview" user experience and aligns the player with industry standards for accessibility and usability.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `HeliosPlayer.handleKeydown` logic)
- **Modify**: `packages/player/src/interaction.test.ts` (Add unit tests for new shortcuts)
- **Read-Only**: `packages/player/src/controllers.ts`

## 3. Implementation Spec
- **Architecture**: Extend the existing `handleKeydown` event listener in `HeliosPlayer` Web Component.
- **Pseudo-Code**:
  ```typescript
  handleKeydown(e) {
    // ... existing checks ...
    switch(e.key) {
      // ... existing cases ...
      case 'c':
      case 'C':
        this.toggleCaptions();
        break;
      case 'Home':
        e.preventDefault();
        if (this.controller) {
          this.controller.seek(0);
        }
        break;
      case 'End':
        e.preventDefault();
        if (this.controller) {
           const state = this.controller.getState();
           const totalFrames = state.duration * state.fps;
           this.controller.seek(totalFrames);
        }
        break;
      default:
        // Handle 0-9 keys
        if (e.key >= '0' && e.key <= '9' && this.controller) {
           const state = this.controller.getState();
           const percent = parseInt(e.key) * 0.1;
           const totalFrames = state.duration * state.fps;
           this.controller.seek(Math.floor(totalFrames * percent));
        }
        break;
    }
  }
  ```
- **Public API Changes**: None (Internal behavior change only).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run unit tests for player interaction.
  ```bash
  cd packages/player && npx vitest run src/interaction.test.ts
  ```
- **Success Criteria**:
  - Pressing `c` toggles the caption visibility state.
  - Pressing `0` seeks to the beginning.
  - Pressing `5` seeks to 50% of the timeline.
  - Pressing `Home` seeks to the beginning.
  - Pressing `End` seeks to the end.
- **Edge Cases**:
  - Seeking when `duration` is 0 (should seek to 0).
  - Pressing keys while an input element is focused (should be ignored, already handled).
  - Pressing keys when controller is not connected (should do nothing).
  - `End` key should ensure it handles floating point precision (clamping or flooring is handled by seek logic generally, but passing max frames is safe).

## 5. Pre-Commit
- Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
