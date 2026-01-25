#### 1. Context & Goal
- **Objective**: Enhance `<helios-player>` with standard keyboard shortcuts (Space, Arrows, F) and a Fullscreen toggle button.
- **Trigger**: "UI controls" vision gap; the player lacks standard accessibility and usability features expected in video players.
- **Impact**: Improves user experience, enables "Studio-like" interactions, and aligns with standard video player behavior.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Update template to include a `.fullscreen-btn`.
  - Add `keydown` and `fullscreenchange` listeners.
  - Implement `toggleFullscreen` and `handleKeydown` methods.
- **Create**: `packages/player/src/index.test.ts`
  - Create unit tests for the `<helios-player>` web component using Vitest/JSDOM.

#### 3. Implementation Spec
- **Architecture**:
  - **Focus Management**: The host element will receive `tabindex="0"` to capture keyboard events.
  - **Fullscreen API**: Uses standard `requestFullscreen` and `exitFullscreen` APIs, with a UI button to trigger the toggle.
  - **Keyboard Listeners**: A `keydown` listener on the host will dispatch actions to the controller.
- **Pseudo-Code**:
  ```javascript
  connectedCallback:
    setAttribute('tabindex', '0')
    addEventListener('keydown', handleKeydown)
    document.addEventListener('fullscreenchange', updateFullscreenIcon)

  handleKeydown(e):
    if key is Space or 'k':
      prevent default scrolling
      togglePlayPause()
    if key is 'f':
      toggleFullscreen()
    if key is ArrowRight or 'l':
      current = controller.getState().currentFrame
      seek(current + 10) // Seek 10 frames
    if key is ArrowLeft or 'j':
      current = controller.getState().currentFrame
      seek(current - 10)

  toggleFullscreen():
    if document.fullscreenElement:
      document.exitFullscreen()
    else:
      this.requestFullscreen()
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure successful compilation.
  - Run `npm test -w packages/player` to execute the new component tests.
- **Success Criteria**:
  - New unit tests pass, verifying that key presses trigger the expected controller methods (play/pause/seek).
  - Fullscreen button toggle logic is verified (via mocks).
- **Edge Cases**:
  - Pressing keys when the player is not focused (should be ignored by default if listener is on host).
  - Seeking below 0 or above duration (handled by Controller/Helios).
