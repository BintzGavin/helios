#### 1. Context & Goal
- **Objective**: Implement global keyboard shortcuts (Space, Arrows, Home) and frame-by-frame navigation buttons in the Studio UI.
- **Trigger**: Vision gap - The README explicitly lists "Playback Controls - Play/pause, frame-by-frame navigation... and keyboard shortcuts" as a planned feature for V1.x, but these are currently missing or incomplete.
- **Impact**: This critical usability feature transforms the Studio from a passive previewer into an active editing environment, significantly improving the "Editor" experience.

#### 2. File Inventory
- **Modify**: `packages/studio/src/hooks/useKeyboardShortcut.ts`
  - Update the hook to support a `disableInInput` option.
- **Modify**: `packages/studio/src/components/Controls/PlaybackControls.tsx`
  - Add "Previous Frame" and "Next Frame" buttons to the UI.
- **Create**: `packages/studio/src/components/GlobalShortcuts.tsx`
  - Implement the keyboard logic for Space, Arrows, and Home keys.
- **Modify**: `packages/studio/src/App.tsx`
  - Integrate the `GlobalShortcuts` component.
- **Modify**: `packages/studio/src/components/Timeline.tsx`
  - Update existing shortcuts ('i', 'o') to respect the new `disableInInput` option.

#### 3. Implementation Spec
- **Architecture**:
  - Centralized keyboard handling via a headless `<GlobalShortcuts />` component mounted in the `App` root.
  - Enhanced `useKeyboardShortcut` hook to safely handle global keys without interfering with form inputs (Props Editor).
- **Pseudo-Code**:
  ```typescript
  // useKeyboardShortcut.ts
  // Add 'disableInInput' to options interface
  // In handler:
  if (options.disableInInput) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
      return;
    }
  }

  // GlobalShortcuts.tsx
  useKeyboardShortcut(' ', (e) => {
    e.preventDefault(); // Stop scroll
    if (isPlaying) pause();
    else if (atEnd) { seek(0); play(); }
    else play();
  }, { disableInInput: true });

  useKeyboardShortcut('ArrowLeft', (e) => {
    const amount = e.shiftKey ? 10 : 1;
    seek(currentFrame - amount);
  }, { disableInInput: true });

  useKeyboardShortcut('ArrowRight', (e) => {
    const amount = e.shiftKey ? 10 : 1;
    seek(currentFrame + amount);
  }, { disableInInput: true });

  useKeyboardShortcut('Home', () => {
     seek(0);
  }, { disableInInput: true });
  ```
- **Public API Changes**: None (internal UI only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run dev` in `packages/studio` (or `npx helios studio`).
- **Success Criteria**:
  - Pressing `Space` toggles playback (and prevents page scroll).
  - Pressing `Space` while typing in the Props Editor input does NOT toggle playback.
  - `Left/Right` arrow keys move the playhead by 1 frame (or 10 with Shift).
  - UI buttons (`<` / `>`) appear in the controls and function correctly.
- **Edge Cases**:
  - Pressing Play at the very end of the video should auto-rewind to 0.
  - Shortcuts should work regardless of where focus is (unless in an input).
