#### 1. Context & Goal
- **Objective**: Implement missing "JKL" keyboard shortcuts documentation in the Help Modal and update the Play/Pause documentation.
- **Trigger**: The README specifies JKL shortcuts (reverse playback/speed down, pause, playback/speed up) have been added to the application, but they are not listed in the Keyboard Shortcuts Modal. Also "Play / Pause" is documented with just "Space" but `K` is also play/pause. J is reverse play, and L is forward play.
- **Impact**: Provides accurate, complete documentation to users about available playback shortcuts, fulfilling the vision gap for comprehensive UI controls.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/KeyboardShortcutsModal.tsx` to update the `Playback` section of the `SHORTCUTS` array to include J, K, and L key shortcuts.
- **Read-Only**: `packages/studio/src/components/GlobalShortcuts.tsx` (to verify exact shortcut behavior)

#### 3. Implementation Spec
- **Architecture**: Plain React UI update.
- **Pseudo-Code**:
  - Open `packages/studio/src/components/KeyboardShortcutsModal.tsx`.
  - In `const SHORTCUTS: ShortcutSection[] = [`, under the `Playback` title:
    - Update the `Play / Pause` entry to perhaps include `K`, or add new entries. Specifically:
      - description: 'Play / Pause', keys: ['Space', 'or', 'K']
      - description: 'Play Reverse / Slower', keys: ['J']
      - description: 'Play Forward / Faster', keys: ['L']
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run verify` in `packages/studio` or `npx tsx scripts/verify-ui.ts`.
- **Success Criteria**: The Keyboard Shortcuts Modal (`?` shortcut) successfully lists the J, K, L shortcuts. Test suite in Studio passes.
- **Edge Cases**: None.
