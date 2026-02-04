# PLAYER: Audio Menu Accessibility

#### 1. Context & Goal
- **Objective**: Improve accessibility of the Audio Track Menu in `<helios-player>` by adding keyboard support (Escape key), focus management, and ARIA attributes.
- **Trigger**: The Audio Menu (introduced in v0.67.0) currently lacks keyboard navigation support and proper ARIA states, making it inaccessible to screen reader and keyboard-only users.
- **Impact**: Ensures compliance with WCAG standards and improves the user experience for all users by enabling standard menu interaction patterns.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement accessibility logic, event handlers, and ARIA attributes)
- **Create**: `packages/player/src/features/audio-menu.test.ts` (New test suite to verify audio menu interactions)
- **Read-Only**: `packages/player/src/features/audio-tracks.ts` (Reference for track data structure)

#### 3. Implementation Spec
- **Architecture**:
  - Leverage standard DOM interfaces (`HTMLElement.focus()`, `KeyboardEvent`) within the `HeliosPlayer` Web Component.
  - No new dependencies or architectural changes; strictly UI logic refinement.

- **Pseudo-Code**:
  ```typescript
  // In packages/player/src/index.ts

  // 1. Template Update
  // Add attributes to .audio-btn:
  // aria-haspopup="true"
  // aria-controls="audio-menu"
  // aria-expanded="false" (default)

  // 2. toggleAudioMenu(e)
  // If opening:
  //   this.audioBtn.setAttribute("aria-expanded", "true");
  //   this.audioMenu.classList.remove("hidden");
  //   // Move focus to first interactive element
  //   const firstInput = this.audioMenu.querySelector("input, button");
  //   if (firstInput) firstInput.focus();
  // Else (closing):
  //   this.closeAudioMenu();

  // 3. closeAudioMenu()
  //   this.audioMenu.classList.add("hidden");
  //   this.audioBtn.setAttribute("aria-expanded", "false");
  //   // Note: We do NOT force focus back here generally (e.g. click outside),
  //   // but specific handlers (Escape) will.

  // 4. handleKeydown(e)
  //   switch (e.key):
  //     case "Escape":
  //       if (!this.audioMenu.classList.contains("hidden")) {
  //         this.closeAudioMenu();
  //         this.audioBtn.focus(); // Return focus to button
  //         e.stopPropagation(); // Prevent bubbling
  //       }
  //       break;
  ```

- **Public API Changes**: None. Internal behavior only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run the new test suite: `npx vitest packages/player/src/features/audio-menu.test.ts`
  - Run all player tests: `npm test -w packages/player`
- **Success Criteria**:
  - Clicking Audio Button sets `aria-expanded="true"` and moves focus to the first track volume slider.
  - Pressing Escape closes the menu, sets `aria-expanded="false"`, and returns focus to the Audio Button.
  - Clicking outside closes the menu (existing behavior) and updates `aria-expanded`.
- **Edge Cases**:
  - Menu with no tracks (button should be hidden, but if shown, focus logic should handle empty menu gracefully).
  - Rapid toggling.
  - Interaction while another menu is open (though currently only one exists).
