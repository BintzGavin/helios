#### 1. Context & Goal
- **Objective**: Make `<helios-player>` respect `width`, `height`, and `src` attribute changes dynamically.
- **Trigger**: Vision Gap. The `README.md` demonstrates usage with `width` and `height` attributes (e.g., `<helios-player width="1920" height="1080">`), but the current implementation ignores them and forces a 16:9 aspect ratio. Additionally, changing the `src` attribute at runtime does not reload the player.
- **Impact**: Improves usability and conformance to the documentation. Allows users to embed players with custom aspect ratios (e.g., vertical video) and dynamically switch compositions without destroying the DOM element.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
    - Add `observedAttributes` getter.
    - Implement `attributeChangedCallback` method.
    - Update styles to react to `width` and `height`.
    - Update iframe source when `src` changes.
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for `dispose` logic)

#### 3. Implementation Spec
- **Architecture**: Use Standard Web Component Lifecycle (`attributeChangedCallback`) to react to attribute changes. No new classes or files needed.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer extends HTMLElement {
    // 1. Observe attributes
    static get observedAttributes() { return ['src', 'width', 'height']; }

    // 2. React to changes
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;

      if (name === 'src') {
         // Reload iframe
         this.iframe.src = newVal;
         // Clean up existing controller and show loading state
         // (The 'load' event listener on iframe will handle reconnection)
         if (this.controller) {
             this.controller.pause(); // Stop playback
             this.controller.dispose();
             this.controller = null;
         }
         this.setControlsDisabled(true);
         this.showStatus("Loading...", false);
      }

      if (name === 'width' || name === 'height') {
         this.updateAspectRatio();
      }
    }

    // 3. Helper to update aspect ratio
    updateAspectRatio() {
       const w = parseFloat(this.getAttribute('width'));
       const h = parseFloat(this.getAttribute('height'));

       if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
          // Set aspect-ratio style on :host
          this.style.aspectRatio = `${w} / ${h}`;
       } else {
          // Revert to default
          this.style.aspectRatio = "16 / 9";
       }
    }

    // Note: Call updateAspectRatio() in connectedCallback() as well
    // to handle initial attributes.
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure TypeScript compiles correctly.
  - Manual verification (if possible) or visually checking code to ensure logic covers `src` reset.
- **Success Criteria**:
    - `attributeChangedCallback` is implemented.
    - `src` changes trigger a controller dispose and iframe src update.
    - `width`/`height` changes update `this.style.aspectRatio`.
- **Edge Cases**:
    - `width` provided without `height` (or vice versa): Should fall back to default (16:9).
    - `src` set to null/empty: Should probably clear iframe.
    - Rapid `src` changes: The latest one wins, previous controllers disposed.
