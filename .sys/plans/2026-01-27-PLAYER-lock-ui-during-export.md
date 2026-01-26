# Context & Goal
- **Objective**: Disable playback controls (Play, Pause, Scrub, Speed, Fullscreen) and keyboard shortcuts during Client-Side Export to prevent race conditions and video corruption.
- **Trigger**: "Client-Side Export" allows concurrent user interaction, which breaks the export loop (VideoEncoder) and causes frame skipping/jitter.
- **Impact**: Ensures data integrity of exported videos and provides a clearer "busy" state to the user.

# File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Add `isExporting` state property.
  - Implement `lockPlaybackControls(locked: boolean)` method.
  - Update `renderClientSide` to lock/unlock controls.
  - Update `handleKeydown` to respect `isExporting` state.
- **Read-Only**: `packages/player/src/features/exporter.ts` (Reference only)

# Implementation Spec
- **Architecture**:
  - Add `private isExporting: boolean = false;` to `HeliosPlayer` class.
  - Add helper `lockPlaybackControls(locked: boolean)`:
    - Sets `disabled` on `this.playPauseBtn`, `this.scrubber`, `this.speedSelector`, `this.fullscreenBtn`.
    - Does **NOT** disable `this.exportBtn` (needed for Cancel).
  - In `renderClientSide()`:
    - Set `this.isExporting = true` and call `this.lockPlaybackControls(true)` before `exporter.export()`.
    - Wrap execution in `try/finally`.
    - In `finally`, set `this.isExporting = false` and call `this.lockPlaybackControls(false)`.
  - In `handleKeydown()`:
    - Add check `if (this.isExporting) return;` at the top of the method.

- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer extends HTMLElement {
    private isExporting = false;

    private renderClientSide = async () => {
      // Existing cancel logic...
      if (this.abortController) { /* ... */ return; }

      this.isExporting = true;
      this.lockPlaybackControls(true);
      // Update Export button text to "Cancel"

      try {
        await exporter.export({ /* ... */ });
      } catch (e) {
        // Log error
      } finally {
        this.isExporting = false;
        this.lockPlaybackControls(false);
        // Reset Export button text
        this.abortController = null;
      }
    }

    private lockPlaybackControls(locked: boolean) {
      this.playPauseBtn.disabled = locked;
      this.scrubber.disabled = locked;
      this.speedSelector.disabled = locked;
      this.fullscreenBtn.disabled = locked;
    }

    private handleKeydown = (e: KeyboardEvent) => {
       if (this.isExporting) return;
       // ... existing logic
    }
  }
  ```

- **Dependencies**: None.

# Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - `playPauseBtn.disabled` is true during export.
  - `scrubber.disabled` is true during export.
  - `fullscreenBtn.disabled` is true during export.
  - Controls re-enable after export or cancel.
- **Edge Cases**:
  - User cancels export -> controls must unlock.
  - Export throws error -> controls must unlock.
