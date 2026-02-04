# Context & Goal
- **Objective**: Align `<helios-player>` keyboard navigation with standard video player conventions (seeking by time instead of frames) and improve feature discoverability via a built-in "Help" dialog.
- **Trigger**: Vision Gap - "Standard keyboard shortcuts" promise in README conflicts with non-standard frame-stepping arrow keys; lack of discoverability for existing shortcuts.
- **Impact**: Improves User Experience (UX) and Developer Experience (DX) by making navigation predictable and features discoverable.

# File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement logic and UI)
- **Modify**: `packages/player/src/index.test.ts` (Update tests for new behavior)

# Implementation Spec
### Architecture
- **Web Component**: Update Shadow DOM template to include a hidden `.help-overlay` structure.
- **Logic**:
    - Implement `seekRelativeTime(seconds: number)` helper in `HeliosPlayer`.
    - Refactor `handleKeydown` to use standard mappings.
    - Implement `toggleHelp()` to show/hide the overlay.

### Keyboard Mappings (New Standard)
- **Space / K**: Play/Pause (Existing)
- **F**: Toggle Fullscreen (Existing)
- **M**: Mute/Unmute (Existing)
- **Arrow Left / Right**: Seek -/+ 5 seconds (Changed from 1 frame)
- **Shift + Arrow Left / Right**: Seek -/+ 1 second (Changed from 10 frames)
- **J / L**: Seek -/+ 10 seconds (YouTube standard)
- **. / ,**: Step +/- 1 frame (Existing)
- **< / > (Shift + , / .)**: Decrease / Increase Playback Speed (New)
- **Home**: Seek to Start (New)
- **End**: Seek to End (New)
- **0-9**: Seek to 0% - 90% (New)
- **C**: Toggle Captions (New)
- **? (Shift + /)**: Toggle Help Dialog (New)
- **I / O / X**: Loop Range Controls (Existing)
- **Shift + D**: Toggle Diagnostics (Existing)

### UI Changes
- Add `.help-overlay` to Shadow DOM template:
  ```html
  <div class="help-overlay hidden" part="help-overlay">
    <div class="help-header">
      <span class="help-title">Keyboard Shortcuts</span>
      <button class="close-help-btn">×</button>
    </div>
    <div class="help-grid">
      <!-- Generated content or static list -->
    </div>
  </div>
  ```
- Add CSS for `.help-overlay` (centered, dark background, grid layout).

### Pseudo-Code
```typescript
class HeliosPlayer {
  // ... existing code ...

  private seekRelativeTime(seconds: number) {
    if (!this.controller) return;
    const state = this.controller.getState();
    const currentSeconds = state.currentFrame / state.fps;
    const newSeconds = Math.max(0, Math.min(state.duration, currentSeconds + seconds));
    this.controller.seek(Math.floor(newSeconds * state.fps));
  }

  private handleKeydown(e) {
    // ...
    switch(e.key) {
      case "ArrowRight":
        this.seekRelativeTime(e.shiftKey ? 1 : 5);
        break;
      case "l":
      case "L":
        this.seekRelativeTime(10);
        break;
      case ">":
        this.adjustPlaybackRate(1); // Next step up
        break;
      case "?":
        this.toggleHelp();
        break;
      case "c":
      case "C":
        this.toggleCaptions();
        break;
      case "Home":
        this.controller.seek(0);
        break;
      case "End":
        // seek to end
        break;
      // ... 0-9 handling
    }
  }
}
```

# Test Plan
- **Verification**: Run `npm test -w packages/player` to verify `index.test.ts`.
- **Success Criteria**:
    - Arrow keys seek 5 seconds (150 frames @ 30fps) instead of 1 frame.
    - New keys (J, L, <, >, Home, End, 0-9, C) trigger expected actions.
    - `?` key toggles the help overlay visibility.
- **Edge Cases**:
    - Seeking past duration clamps to end.
    - Seeking before 0 clamps to start.
    - Help dialog closes on Escape or click outside.
