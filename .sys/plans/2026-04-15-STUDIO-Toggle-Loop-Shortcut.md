#### 1. Context & Goal
- **Objective**: Implement a keyboard shortcut to toggle playback looping in the Studio UI.
- **Trigger**: The 'L' shortcut was previously reassigned to "Play Forward / Speed Up", leaving the loop toggle functionality without a keyboard shortcut, which contradicts documentation.
- **Impact**: Restores critical playback control functionality for developers without overriding standard J/K/L editing shortcuts.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/studio/src/components/GlobalShortcuts.tsx`, `packages/studio/src/components/KeyboardShortcutsModal.tsx`]
- **Read-Only**: [`packages/studio/src/context/StudioContext.tsx`]

#### 3. Implementation Spec
- **Architecture**: Extend the existing React-based global shortcut handling using the `useKeyboardShortcut` hook.
- **Pseudo-Code**:
  - In `GlobalShortcuts.tsx`, add a new `useKeyboardShortcut` binding for `l` combined with `shiftKey`.
  - The handler should invoke `toggleLoop` from `useStudio()`.
  - Ensure the modal in `KeyboardShortcutsModal.tsx` is updated to reflect `Shift+L` for toggling the loop instead of `L`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run dev` in the `packages/studio` workspace. Press `Shift+L` in the Studio UI and observe the loop state toggle in the Playback Controls panel.
- **Success Criteria**: The loop state changes when `Shift+L` is pressed, and the shortcut is properly documented in the Keyboard Shortcuts modal overlay (`?`).
- **Edge Cases**: Verify that pressing `L` alone continues to speed up playback and is not intercepted by the loop toggle.
