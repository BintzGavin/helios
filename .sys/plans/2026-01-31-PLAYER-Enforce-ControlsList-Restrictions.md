# Plan: Enforce ControlsList Restrictions

## 1. Context & Goal
- **Objective**: Strictly enforce `controlslist` attribute restrictions (`nofullscreen`, `nodownload`) on `<helios-player>` by disabling associated keyboard shortcuts, double-click gestures, and ensuring buttons are disabled state-wise, not just hidden.
- **Trigger**: "Standard Media API" gap. Currently, `controlslist="nofullscreen"` hides the UI button but leaves the 'F' key and double-click-to-fullscreen active, creating inconsistent behavior.
- **Impact**: Improves compliance with HTMLMediaElement behavior, providing developers with reliable control over the player's user interaction capabilities.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `HeliosPlayer` logic)
- **Modify**: `packages/player/src/index.test.ts` (Add enforcement tests)

## 3. Implementation Spec
- **Architecture**:
  - Add `hasControlToken(token: string): boolean` helper to `HeliosPlayer` class.
  - Update `toggleFullscreen()` to guard against `nofullscreen` token.
  - Update `updateControlsVisibility()` to set `.disabled = true` on buttons in addition to hiding them.
  - Ensure `setControlsDisabled` respects the `controlslist` restrictions when re-enabling controls.
- **Pseudo-Code**:
  ```typescript
  // packages/player/src/index.ts

  private hasControlToken(token: string): boolean {
    const attr = this.getAttribute("controlslist") || "";
    return attr.toLowerCase().split(/\s+/).includes(token.toLowerCase());
  }

  private toggleFullscreen = () => {
    if (this.hasControlToken("nofullscreen")) return;

    if (!document.fullscreenElement) {
       // ... existing logic
    } else {
       // ... existing logic
    }
  };

  private updateControlsVisibility() {
    // ...
    if (this.hasControlToken("nodownload")) {
      this.exportBtn.style.display = "none";
      this.exportBtn.disabled = true;
    }
    // ... same for fullscreen

    // Re-evaluate disabled state (since we might have just disabled them)
    // Note: This interacts with setControlsDisabled logic.
    // Ideally updateControlsVisibility just sets the "permanent" restriction
    // and setControlsDisabled handles the "temporary" (loading) state.
    // However, simplest is to ensure setControlsDisabled also checks tokens.
  }

  private setControlsDisabled(disabled: boolean) {
      // ...
      this.fullscreenBtn.disabled = disabled || this.hasControlToken("nofullscreen");
      // ...
      if (disabled || this.hasControlToken("nodownload")) {
          this.exportBtn.disabled = true;
      }
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - Add tests to `packages/player/src/index.test.ts`:
    - `it('should ignore "F" key when controlslist="nofullscreen"')`
    - `it('should ignore double click when controlslist="nofullscreen"')`
    - `it('should disable buttons when controlslist is set"')`
  - All tests pass.
- **Edge Cases**:
  - `controlslist` updated dynamically via `setAttribute`.
  - Case insensitivity and whitespace handling.
