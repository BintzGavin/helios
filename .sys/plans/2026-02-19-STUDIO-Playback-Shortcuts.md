# Context & Goal
- **Objective**: Implement global keyboard shortcuts for playback control (Play/Pause, Frame Stepping, Seek Start) and prevent shortcuts from triggering when typing in inputs.
- **Trigger**: Vision gap - "Playback controls lack keyboard shortcuts and frame-by-frame navigation."
- **Impact**: Improves the "Studio" experience by enabling standard video editing shortcuts, bringing it closer to V1 vision.

# File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/hooks/useKeyboardShortcut.ts` (Add `ignoreInput` option)
  - `packages/studio/src/components/Timeline.tsx` (Enable `ignoreInput` for existing shortcuts)
  - `packages/studio/src/App.tsx` (Add new playback shortcuts)
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx` (To understand controller API)

# Implementation Spec
- **Architecture**:
  - Enhance `useKeyboardShortcut` hook to handle `document.activeElement` checks.
  - Implement shortcuts at the top-level `App` component to ensure global availability.
- **Pseudo-Code**:
  - `useKeyboardShortcut.ts`:
    - Add `ignoreInput?: boolean` to options (default `false`).
    - Inside handler: check `document.activeElement.tagName`.
    - `if (ignoreInput && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;`
  - `App.tsx`:
    - Import `useStudio` to access `controller` and `playerState`.
    - `useKeyboardShortcut(' ', () => togglePlay(), { ignoreInput: true, preventDefault: true })`
    - `useKeyboardShortcut('ArrowLeft', () => seek(currentFrame - 1), { ignoreInput: true })`
    - `useKeyboardShortcut('ArrowRight', () => seek(currentFrame + 1), { ignoreInput: true })`
    - `useKeyboardShortcut('Home', () => seek(0), { ignoreInput: true })`
  - `Timeline.tsx`:
    - Update `i` and `o` shortcuts to use `{ ignoreInput: true }`.
- **Public API Changes**:
  - `useKeyboardShortcut` hook signature update (options object).
- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npm run dev` in `packages/studio`.
  - Press Space: Toggles play/pause.
  - Press Arrow Right: Advances 1 frame.
  - Press Arrow Left: Reverses 1 frame.
  - Press Home: Jumps to 0.
  - Click into Props Editor input and type Space/Arrows: Shortcuts should NOT trigger.
- **Success Criteria**:
  - Playback is controllable via keyboard.
  - Typing in inputs does not trigger playback actions or range markers.
- **Edge Cases**:
  - Modifiers (e.g. Cmd+K) should still work even if focus is in input (depending on use case, but for playback, we focus on no modifiers).
