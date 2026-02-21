# 2024-05-22-PLAYER-Focus-Trapping

#### 1. Context & Goal
- **Objective**: Implement focus trapping for all modal menus (Audio, Settings, Export) and overlays (Shortcuts, Diagnostics) within `<helios-player>`.
- **Trigger**: Vision gap identified in "UI controls" - current implementation allows focus to leak out of modal menus, violating accessibility standards (WCAG 2.1.2).
- **Impact**: Improves keyboard navigation and accessibility compliance, ensuring users are not lost when interacting with player settings.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add `trapFocus` method, update `handleKeydown`, add `aria-modal` attributes).
- **Create**: `packages/player/src/accessibility.test.ts` (New test suite for focus management).
- **Read-Only**: `packages/player/src/interaction.test.ts` (Reference for test setup).

#### 3. Implementation Spec
- **Architecture**:
  - Add a private helper method `trapFocus(container: HTMLElement, e: KeyboardEvent)` to `HeliosPlayer` class.
  - This method will identify the first and last focusable elements within the container.
  - On `Shift+Tab` from the first element, it will move focus to the last element.
  - On `Tab` from the last element, it will move focus to the first element.
  - Update `handleKeydown` to detect if any modal (Shortcuts, Diagnostics, Export, Settings, Audio) is open and call `trapFocus`.
  - Add `aria-modal="true"` to the menu/overlay containers in the HTML template.

- **Pseudo-Code**:
  ```typescript
  // In HeliosPlayer class
  private trapFocus(element: HTMLElement, e: KeyboardEvent) {
    const focusable = element.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    const active = this.shadowRoot!.activeElement;

    if (e.shiftKey) {
      if (active === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (active === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  // Update handleKeydown
  private handleKeydown = (e: KeyboardEvent) => {
      // ... existing checks ...

      // Check overlays/menus in priority order
      const openModal = [
          this.shortcutsOverlay,
          this.debugOverlay,
          this.exportMenu,
          this.settingsMenu,
          this.audioMenu
      ].find(el => !el.classList.contains("hidden"));

      if (openModal) {
          if (e.key === "Tab") {
              this.trapFocus(openModal, e);
          } else if (e.key === "Escape") {
              // Existing logic handles specific menus, ensure it covers all
              e.stopPropagation();
              if (openModal === this.audioMenu) this.closeAudioMenu();
              else if (openModal === this.settingsMenu) this.closeSettingsMenu();
              else if (openModal === this.exportMenu) this.closeExportMenu();
              else if (openModal === this.shortcutsOverlay) this.toggleShortcutsOverlay();
              else if (openModal === this.debugOverlay) this.toggleDiagnostics();

              // Restore focus to trigger button if applicable
              // (Logic for button focus restoration is partially in existing close methods or handleKeydown, ensure consistency)
          }
          // Prevent other global shortcuts (like Space/K for play) if we are in a modal?
          // If we are in a modal, we probably don't want 'Space' to toggle play unless focused on a button.
          // The existing check `if (target.tagName === "INPUT" ...)` handles inputs.
          // But if focused on a non-button in a modal (e.g. just the container?), Space might bubble.
          return;
      }

      // ... existing global shortcuts ...
  }
  ```

- **HTML Template Changes**:
  - Add `aria-modal="true"` to:
    - `.audio-menu`
    - `.settings-menu`
    - `.export-menu`
    - `.shortcuts-overlay`
    - `.debug-overlay`

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player` to execute the new test suite.
- **Success Criteria**:
  - New test `packages/player/src/accessibility.test.ts` passes.
  - Test should simulate opening a menu (e.g., Settings), pressing `Tab` repeatedly, and verifying `document.activeElement` (or shadow root active element) cycles correctly.
  - Existing tests in `packages/player` pass.
