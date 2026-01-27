# Context & Goal
- **Objective**: Implement the standard `muted` attribute on the `<helios-player>` Web Component to control initial audio state and reflect changes.
- **Trigger**: "Standard Media API" parity gap. The `muted` attribute is a standard HTML5 media attribute missing from our implementation.
- **Impact**: Users can declaratively mute the player (e.g., `<helios-player muted src="...">`), which is often required for autoplay policies and improves developer experience.

# File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Add `muted` to `observedAttributes`.
  - Handle `muted` in `attributeChangedCallback`.
  - Check `muted` attribute in `setController`.
- **Modify**: `packages/player/src/index.test.ts`
  - Add tests for initialization with `muted`.
  - Add tests for dynamic `muted` attribute changes.

# Implementation Spec
- **Architecture**: Web Component attribute observation bridging to Controller method.
- **Pseudo-Code**:
  - `packages/player/src/index.ts`:
    - Add `"muted"` to `observedAttributes` getter.
    - In `attributeChangedCallback(name, oldVal, newVal)`:
      - If `name === "muted"`:
        - `const isMuted = this.hasAttribute("muted");`
        - `if (this.controller) this.controller.setAudioMuted(isMuted);`
    - In `setController(controller)`:
      - After initialization:
      - `if (this.hasAttribute("muted")) controller.setAudioMuted(true);`
- **Public API Changes**: No TS interface changes, but the Web Component now responds to the `muted` attribute.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm test packages/player`
- **Success Criteria**:
  - Unit tests pass.
  - Test case: `<helios-player muted>` -> controller.setAudioMuted(true) called.
  - Test case: `player.setAttribute('muted', '')` -> controller.setAudioMuted(true) called.
  - Test case: `player.removeAttribute('muted')` -> controller.setAudioMuted(false) called.
- **Edge Cases**:
  - `muted` and `autoplay` together.
