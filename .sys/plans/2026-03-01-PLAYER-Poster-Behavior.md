# 📋 Plan: Improve Player Poster Behavior

#### 1. Context & Goal
- **Objective**: Improve the `<helios-player>` `poster` behavior to match the HTML5 `<video>` standard.
- **Trigger**: Currently, the poster image is hidden immediately when the iframe starts loading (if `preload="auto"`), causing a visual flash or a black screen with a "Loading..." overlay instead of the poster image.
- **Impact**: Users will see the poster image persist during the loading phase and until playback begins or the user seeks, providing a smoother and more standard user experience.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` - Update state management and visibility logic for the poster.
- **Modify**: `packages/player/src/index.test.ts` - Update tests to verify correct poster persistence.
- **Read-Only**: `packages/core/src/index.ts` (for state reference).

#### 3. Implementation Spec
- **Architecture**:
  - Introduce a `hasInteracted` state variable to track user intent (play/seek).
  - Decouple poster visibility from the "loaded" state of the iframe.
  - Prioritize poster visibility over the "Loading..." status overlay.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    private hasInteracted: boolean = false;

    // Reset on src change
    attributeChangedCallback(name, oldVal, newVal) {
       if (name === 'src') {
           this.hasInteracted = false;
           // ...
       }
       // ...
    }

    // New visibility logic
    private updatePosterVisibility() {
       const hasPoster = this.hasAttribute("poster");
       // Show if we have a poster AND (we are deferring OR we haven't interacted yet)
       const shouldShow = hasPoster && (this.pendingSrc || !this.hasInteracted);

       if (shouldShow) {
           this.posterContainer.classList.remove("hidden");
       } else {
           this.posterContainer.classList.add("hidden");
       }
    }

    // Hook into interaction points
    private togglePlayPause() {
        this.hasInteracted = true;
        this.updatePosterVisibility();
        // ...
    }

    private seekRelative() {
        this.hasInteracted = true;
        this.updatePosterVisibility();
        // ...
    }

    private handleScrubStart() {
        this.hasInteracted = true;
        this.updatePosterVisibility();
        // ...
    }

    // Sync with external state changes (e.g. autoplay or external controls)
    private updateUI(state) {
        if (state.isPlaying || state.currentFrame > 0) {
            this.hasInteracted = true;
        }
        this.updatePosterVisibility();
        // ...
    }
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New test `should keep poster visible after loading but before playback` passes.
  - New test `should hide poster when playback starts` passes.
  - New test `should hide poster when seeking` passes.
  - All existing tests pass.
- **Edge Cases**:
  - `preload="none"`: Verify poster stays until explicit interaction.
  - `autoplay`: Verify poster hides shortly after load (when `isPlaying` becomes true).
  - Seek to 0: Verify poster does NOT reappear if `hasInteracted` is true.
  - `complete pre-commit steps` to ensure proper testing, verification, review, and reflection are done.
