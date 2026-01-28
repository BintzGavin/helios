# Spec: Refine Player Poster & Loading Lifecycle

## 1. Context & Goal
- **Objective**: Refine the `HeliosPlayer` Web Component lifecycle to ensure the poster image remains visible until the composition is fully connected and ready to display, preventing a "flash of empty iframe" during loading.
- **Trigger**: Vision Gap Analysis identified a poor user experience where `loadIframe` hides the poster immediately upon setting the `src`, exposing the loading iframe before content is available.
- **Impact**: Improves the perceived performance and polish of the "In-Browser Preview" and aligns with standard video player behavior.

## 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Update `HeliosPlayer` class to track "ready" state and adjust poster visibility logic.
  - `packages/player/src/index.test.ts`: Add test cases for the loading lifecycle and verify poster persistence.

## 3. Implementation Spec
- **Architecture**:
  - Introduce a private `isReady` state (boolean) to `HeliosPlayer`.
  - Decouple `isLoaded` (iframe src set) from `poster` visibility.
  - Poster should be hidden ONLY when:
    - The Controller is connected (`HELIOS_READY` received or Direct access established).
    - AND (Optionally) the first frame has been rendered or `play()` is called.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    private isReady: boolean = false;

    loadIframe(src) {
      this.iframe.src = src;
      this.isLoaded = true;
      // Do NOT hide poster here yet
      this.showStatus("Connecting...", false); // Ensure status shows
    }

    setController(controller) {
      this.controller = controller;
      this.isReady = true; // Now we are ready
      this.updatePosterVisibility(); // Now check if we should hide
    }

    updatePosterVisibility() {
      // Show poster if:
      // 1. We have a pending Src (deferred load)
      // 2. OR we have a poster AND we are NOT ready
      if (this.pendingSrc || (this.hasAttribute("poster") && !this.isReady)) {
         showPoster();
      } else {
         // Also check if we are playing or have advanced frame (existing logic in updateUI)
         // But primarily, if ready, we let the video take over.
         hidePoster();
      }
    }

    updateUI(state) {
      // Existing logic to hide poster if playing or frame > 0
      // This might be redundant if isReady handles it, but good as backup
      if (state.isPlaying || state.currentFrame > 0) {
         this.posterContainer.classList.add("hidden");
      }
    }
  }
  ```
- **CSS Changes**:
  - If the poster is visible, the `.status-overlay` (which shows "Connecting...") should probably be transparent or semi-transparent so it doesn't block the poster.
  - Or better: `status-overlay` should be hidden if poster is visible, OR it should just show a small spinner/text on top of the poster.
  - Current `status-overlay` has `background: rgba(0, 0, 0, 0.8)`. We should change this to be transparent if `poster-container` is not hidden.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/player`
- **Success Criteria**:
  - New test `should keep poster visible until controller is connected` passes.
  - Existing `should hide poster when playing starts` still passes (but potentially with adjusted expectations on *when* it hides).
- **Edge Cases**:
  - `preload="none"`: Poster should show.
  - `preload="auto"`: Poster should show until loaded.
  - Connection failure: Poster should probably stay (with error message on top).
