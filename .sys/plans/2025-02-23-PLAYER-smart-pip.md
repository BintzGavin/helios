# 1. Context & Goal
- **Objective**: Implement "Smart PiP Visibility" to automatically hide the Picture-in-Picture button when the environment does not support it or when the player configuration (e.g., `export-mode="dom"`) precludes its usage.
- **Trigger**: Journal entry `[v0.65.0] - PiP Gap in DOM Mode`. The current PiP button remains visible/clickable even when it will strictly fail (e.g., in DOM mode where no canvas exists to capture).
- **Impact**: Improves User Experience by removing broken controls. Prevents user confusion when clicking a button that throws an error.

# 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `observedAttributes`, `attributeChangedCallback`, and `updateControlsVisibility`)
- **Modify**: `packages/player/src/index.test.ts` (Add unit tests for visibility logic)
- **Read-Only**: `packages/player/src/controllers.ts`

# 3. Implementation Spec
- **Architecture**: Enhance the existing `updateControlsVisibility` method in the `HeliosPlayer` Web Component to consider environmental capabilities and configuration attributes.
- **Pseudo-Code**:
  ```typescript
  // in HeliosPlayer class

  static get observedAttributes() {
      // Add "export-mode" to existing list
      return [..., "export-mode", ...];
  }

  attributeChangedCallback(name, oldVal, newVal) {
      // ... existing logic ...
      if (name === "export-mode") {
          this.updateControlsVisibility();
      }
  }

  private updateControlsVisibility() {
      // ... existing export/fullscreen logic ...

      // PiP Logic
      let showPiP = !this.hasAttribute("disablepictureinpicture");

      // 1. Check Browser Capability
      if (!document.pictureInPictureEnabled) {
          showPiP = false;
      }

      // 2. Check Configuration
      // In 'dom' mode, we typically lack a canvas to capture a stream from,
      // rendering the current PiP implementation (canvas.captureStream) impossible.
      if (this.getAttribute("export-mode") === "dom") {
          showPiP = false;
      }

      this.pipBtn.style.display = showPiP ? "" : "none";
  }
  ```
- **Public API Changes**: None (internal logic update). `export-mode` is already an attribute, just making it observed.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  1.  New test `should hide PiP button when export-mode="dom"` passes.
  2.  New test `should hide PiP button when document.pictureInPictureEnabled is false` passes.
  3.  Existing tests pass (no regressions in control visibility).
- **Edge Cases**:
  - `export-mode` attribute removal should restore visibility (if supported).
  - Browser without `pictureInPictureEnabled` (mocked in test) should never show button regardless of attributes.
