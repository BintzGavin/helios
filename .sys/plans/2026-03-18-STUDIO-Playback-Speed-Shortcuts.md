#### 1. Context & Goal
- **Objective**: Implement keyboard shortcuts to decrease and increase playback speed, including reverse playback.
- **Trigger**: The V1.x vision gap states "Playback Controls - Play/pause, frame-by-frame navigation, variable speed playback (including reverse), and keyboard shortcuts". Currently, there are no keyboard shortcuts to control the variable speed playback.
- **Impact**: Brings Studio closer to standard NLE (Non-Linear Editor) capabilities and closes a documented vision gap, allowing users to quickly cycle through speeds and reverse playback without using the mouse.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/components/GlobalShortcuts.tsx`: Add shortcuts for decreasing (`<` or `Shift+,`) and increasing (`>` or `Shift+.`) playback speed.
  - `packages/studio/src/components/KeyboardShortcutsModal.tsx`: Add new shortcuts to the documentation modal.
  - `packages/studio/README.md`: Update the Keyboard Shortcuts table.
- **Read-Only**: `packages/studio/src/components/Controls/PlaybackControls.tsx`

#### 3. Implementation Spec
- **Architecture**: We will use the existing `useKeyboardShortcut` hook in `GlobalShortcuts.tsx` to bind the new keys. We will define an array of allowed speeds (`[-1, 0.25, 0.5, 1, 2, 4]`) matching the `PlaybackControls` select options, and find the next/previous speed when the shortcut is triggered.
- **Pseudo-Code**:
  - In `GlobalShortcuts.tsx`, add an array `const SPEEDS = [-1, 0.25, 0.5, 1, 2, 4];`.
  - Bind `,` (Decrease Speed, requiring shift depending on layout, or just `<`):
    ```typescript
    useKeyboardShortcut('<', () => {
      if (!controller) return;
      const SPEEDS = [-1, 0.25, 0.5, 1, 2, 4];
      const currentIndex = SPEEDS.indexOf(playerState.playbackRate);
      if (currentIndex > 0) {
        controller.setPlaybackRate(SPEEDS[currentIndex - 1]);
      }
    }, { ignoreInput: true });
    ```
  - Bind `.` (Increase Speed, `>`):
    ```typescript
    useKeyboardShortcut('>', () => {
      if (!controller) return;
      const SPEEDS = [-1, 0.25, 0.5, 1, 2, 4];
      const currentIndex = SPEEDS.indexOf(playerState.playbackRate);
      if (currentIndex < SPEEDS.length - 1 && currentIndex !== -1) {
        controller.setPlaybackRate(SPEEDS[currentIndex + 1]);
      }
    }, { ignoreInput: true });
    ```
  - In `KeyboardShortcutsModal.tsx`, add entries to the "Playback" section for "Decrease Speed" (`<`) and "Increase Speed" (`>`).
  - In `packages/studio/README.md`, append the shortcuts to the Keyboard Shortcuts table.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/studio` to verify existing tests pass. Manually run `npx helios studio` and verify that pressing `<` and `>` updates the playback speed in the UI, and the shortcuts modal displays the new bindings correctly.
- **Success Criteria**: Playback speed cycles through `-1, 0.25, 0.5, 1, 2, 4` when using the keyboard shortcuts, successfully fulfilling the variable speed and reverse playback vision requirement.
- **Edge Cases**: Verify that pressing decrease when already at `-1x` does nothing, and pressing increase when at `4x` does nothing. Verify that the loop behaves correctly.