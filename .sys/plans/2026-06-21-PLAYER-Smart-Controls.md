# 2026-06-21-PLAYER-Smart-Controls.md

#### 1. Context & Goal
- **Objective**: Improve `helios-player` UX by intelligently hiding controls that are irrelevant or disabled.
- **Trigger**: Vision gap in "UI controls" - current controls are static and do not adapt to content (e.g., CC button always visible) or configuration (missing `disablepictureinpicture`).
- **Impact**: Cleaner, more standard-compliant UI that reduces user confusion.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement logic for smart control visibility)

#### 3. Implementation Spec
- **Architecture**:
  - Leverage `observedAttributes` and lifecycle callbacks to react to configuration changes.
  - Update `updateControlsVisibility` to handle the `disablepictureinpicture` attribute.
  - Enhance `handleSlotChange` to manage CC button visibility and `default` track behavior.
- **Pseudo-Code**:
  ```typescript
  // In observedAttributes
  return [..., "disablepictureinpicture"];

  // In attributeChangedCallback
  if (name === "disablepictureinpicture") {
     this.updateControlsVisibility();
  }

  // In updateControlsVisibility
  // ... existing logic ...
  if (this.hasAttribute("disablepictureinpicture")) {
     this.pipBtn.style.display = "none";
  } else {
     this.pipBtn.style.removeProperty("display");
  }

  // In handleSlotChange (and initially)
  const hasTracks = this._textTracks.length > 0;
  this.ccBtn.style.display = hasTracks ? "flex" : "none"; // 'flex' because it uses flex layout in CSS

  // Inside track creation loop
  if (isDefault) {
      // Auto-enable if default track is present
      this.showCaptions = true;
      this.ccBtn.classList.add("active");
  }
  ```
- **Public API Changes**:
  - New Attribute: `disablepictureinpicture` (standard HTML5 video attribute).
  - New Property: `disablePictureInPicture` (getter/setter).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - `disablepictureinpicture` attribute hides the PiP button.
  - CC button is `display: none` when no tracks are loaded.
  - Adding a `<track>` element makes the CC button visible.
  - `<track default>` automatically enables captions (sets `showCaptions = true`).
- **Edge Cases**:
  - Dynamic removal of all tracks should re-hide the CC button.
  - Toggling `disablepictureinpicture` via JS should update UI immediately.
