# 2026-03-02-PLAYER-ControlsList

#### 1. Context & Goal
- **Objective**: Implement support for the standard `controlslist` attribute to allow developers to customize the player UI by hiding specific controls.
- **Trigger**: Vision gap in "Standard Media API" compliance and "UI Controls" configurability. Currently, users cannot disable the "Export" button without hiding all controls.
- **Impact**: Enables "nodownload" (hides Export button) and "nofullscreen" (hides Fullscreen button) scenarios, improving embedding flexibility and standard compliance.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add logic to observe and parse `controlslist` attribute)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for UI visibility changes)

#### 3. Implementation Spec
- **Architecture**:
  - Add `controlslist` to `observedAttributes`.
  - Implement `updateControlsVisibility` method to parse the attribute (space-separated tokens).
  - Toggle CSS `display` property of `exportBtn` and `fullscreenBtn` based on `nodownload` and `nofullscreen` tokens.
- **Pseudo-Code**:
  ```typescript
  // In observedAttributes
  return [..., "controlslist"];

  // In attributeChangedCallback
  if (name === "controlslist") {
    this.updateControlsVisibility();
  }

  // New method
  private updateControlsVisibility() {
    const attr = this.getAttribute("controlslist") || "";
    const tokens = attr.toLowerCase().split(/\s+/);

    // this.exportBtn and this.fullscreenBtn are existing class properties
    const noDownload = tokens.includes("nodownload");
    const noFullscreen = tokens.includes("nofullscreen");

    if (noDownload) {
       this.exportBtn.style.display = "none";
    } else {
       this.exportBtn.style.removeProperty("display");
    }

    if (noFullscreen) {
       this.fullscreenBtn.style.display = "none";
    } else {
       this.fullscreenBtn.style.removeProperty("display");
    }
  }
  ```
- **Public API Changes**:
  - Support for `controlslist` attribute on `<helios-player>`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `controlslist="nodownload"` hides the Export button.
  - `controlslist="nofullscreen"` hides the Fullscreen button.
  - Buttons reappear when tokens are removed.
- **Edge Cases**:
  - Empty attribute (should show all).
  - Multiple tokens (e.g. `nodownload nofullscreen`).
  - Case insensitivity.
  - Extra whitespace.
