# 2025-02-18-PLAYER-a11y-focus.md

#### 1. Context & Goal
- **Objective**: Improve accessibility by implementing focus management for UI overlays (Shortcuts, Diagnostics) and adding ARIA live regions for status messages.
- **Trigger**: Review of `packages/player/src/index.ts` revealed that overlays do not manage focus (trap/restore), and status messages (Loading/Error) are not announced to screen readers.
- **Impact**: Ensures the player is usable by keyboard and screen reader users, complying with web component best practices and closing a gap in the "UI controls" vision.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
- **Read-Only**: `packages/player/README.md`

#### 3. Implementation Spec
- **Architecture**:
  - Use `role="alert"` and `aria-live` attributes dynamically in `showStatus` to communicate player state.
  - Implement a simple focus save/restore mechanism for modal overlays (`Shortcuts`, `Diagnostics`).
- **Pseudo-Code**:
  - Add `private lastFocusedElement: HTMLElement | null = null;` property to `HeliosPlayer` class.
  - In `showStatus(msg, isError)`:
    - Set `this.statusText` attribute `role` to `"alert"` if `isError`, else `"status"`.
    - Set `this.statusText` attribute `aria-live` to `"assertive"` if `isError`, else `"polite"`.
  - Update `toggleShortcutsOverlay`:
    - If opening (currently has `hidden` class):
      - Store current focus: `this.lastFocusedElement = (this.shadowRoot?.activeElement || document.activeElement) as HTMLElement;`
      - Render shortcuts: `this.renderShortcuts();`
      - Show overlay: `this.shortcutsOverlay.classList.remove('hidden');`
      - Move focus: `this.closeShortcutsBtn.focus();`
    - If closing:
      - Hide overlay: `this.shortcutsOverlay.classList.add('hidden');`
      - Restore focus: `if (this.lastFocusedElement) { this.lastFocusedElement.focus(); this.lastFocusedElement = null; }`
  - Update `toggleDiagnostics`:
    - If opening:
      - Store focus: `this.lastFocusedElement = (this.shadowRoot?.activeElement || document.activeElement) as HTMLElement;`
      - Show overlay: `this.debugOverlay.classList.remove('hidden');`
      - Move focus: `this.closeDebugBtn.focus();`
      - Run diagnostics logic.
    - If closing:
      - Hide overlay: `this.debugOverlay.classList.add('hidden');`
      - Restore focus: `if (this.lastFocusedElement) { this.lastFocusedElement.focus(); this.lastFocusedElement = null; }`
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure no compilation errors.
  - Run `npm test -w packages/player` to ensure no regressions.
- **Success Criteria**: Build passes, existing tests pass.
- **Edge Cases**:
  - Closing overlay via "Escape" (handled by existing `handleKeydown`) should also trigger focus restore. Verify `handleKeydown` logic or update it to call `toggle...` or ensure close logic is shared.
