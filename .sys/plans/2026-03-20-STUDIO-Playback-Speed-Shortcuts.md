# 1. Context & Goal
- **Objective**: Implement keyboard shortcuts for adjusting playback speed in Helios Studio.
- **Trigger**: The V1.x vision gap states "Playback Controls - Play/pause, frame-by-frame navigation, variable speed playback (including reverse), and keyboard shortcuts". While the UI dropdown exists, there are no keyboard shortcuts to control the variable speed playback.
- **Impact**: Improves the "Agent Experience" and general UX by allowing faster navigation and review of compositions without reaching for the mouse, fulfilling a documented vision requirement.

# 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/studio/src/components/GlobalShortcuts.tsx`: Add shortcuts for increasing, decreasing, and resetting playback speed.
  - `packages/studio/src/components/KeyboardShortcutsModal.tsx`: Document the new shortcuts.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`
  - `packages/studio/src/components/Controls/PlaybackControls.tsx`
  - `packages/studio/src/components/KeyboardShortcutsModal.test.tsx`

# 3. Implementation Spec
- **Architecture**: We will use the existing `useKeyboardShortcut` hook in `GlobalShortcuts.tsx` to listen for new keybindings.
- **Keybindings**:
  - `[` : Decrease playback speed to the next available lower preset.
  - `]` : Increase playback speed to the next available higher preset.
  - `\` : Reset playback speed to `1x`.
- **Pseudo-Code**:
  - In `GlobalShortcuts.tsx`, add an array of available speeds: `const SPEEDS = [-1, 0.25, 0.5, 1, 2, 4];`.
  - Add `[` shortcut: Find current speed index, decrease by 1 (clamped to 0), and call `controller.setPlaybackRate(SPEEDS[newIndex])`.
  - Add `]` shortcut: Find current speed index, increase by 1 (clamped to length - 1), and call `controller.setPlaybackRate(SPEEDS[newIndex])`.
  - Add `\` shortcut: Call `controller.setPlaybackRate(1)`.
  - In `KeyboardShortcutsModal.tsx`, add rows for these three shortcuts in the playback section:
    `{ description: 'Decrease Speed', keys: ['['] }`
    `{ description: 'Increase Speed', keys: [']'] }`
    `{ description: 'Reset Speed', keys: ['\\'] }`
- **Public API Changes**: None.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**:
  - Check the `?` shortcuts modal to ensure they are listed.
  - Run `npm run test` in `packages/studio` to verify `GlobalShortcuts.test.tsx` and `KeyboardShortcutsModal.test.tsx` pass (will need to update snapshots/tests if affected).
- **Success Criteria**: The playback rate can be stepped through the allowed values using the keyboard shortcuts.
- **Edge Cases**: Pressing `[` when already at `-1x` shouldn't error. Pressing `]` when already at `4x` shouldn't error.