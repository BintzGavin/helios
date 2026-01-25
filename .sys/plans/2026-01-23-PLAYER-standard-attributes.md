# Context & Goal
- **Objective**: Align `<helios-player>` with standard `HTMLMediaElement` behavior by implementing `controls`, `autoplay`, and `loop` attributes.
- **Trigger**: Vision Gap - `<helios-player>` currently forces UI controls and lacks standard media attributes, hindering integration in "chromeless" environments (like Studio) or simple autoplay use cases.
- **Impact**: Enables "chromeless" player for Studio, auto-playing animations for landing pages, and looping backgrounds. **Note: This is a BREAKING CHANGE for existing examples as controls will now be hidden by default.**

# File Inventory
- **Create**: `verification/manual-test-attributes.html`
- **Modify**: `packages/player/src/index.ts`
- **Read-Only**: `packages/core/src/index.ts`

# Implementation Spec
- **Architecture**:
  - **Controls**: Use CSS `:host([controls]) .controls` selector to toggle visibility (Native/Clean). Default is `display: none`.
  - **Autoplay**: Check `this.hasAttribute('autoplay')` in `setController()` (connection time).
  - **Loop**: Check `this.hasAttribute('loop')` in `updateUI()` (subscription callback) when playback finishes.
- **Pseudo-Code**:
  - `packages/player/src/index.ts`:
    - Update CSS: `.controls { display: none; }`, `:host([controls]) .controls { display: flex; }`.
    - In `HeliosPlayer.setController(controller)`:
      - After setting controller, check `if (this.hasAttribute('autoplay')) { controller.play(); }`.
    - In `HeliosPlayer.updateUI(state)`:
      - Calculate `isFinished`.
      - `if (isFinished && !state.isPlaying && this.hasAttribute('loop'))`:
        - `this.controller.seek(0);`
        - `this.controller.play();`
- **Public API Changes**:
  - New supported boolean attributes: `controls`, `autoplay`, `loop`.
  - **Breaking Change**: Controls are now hidden by default (requires `controls` attribute).
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - Build passes.
  - Verification file `verification/manual-test-attributes.html` (created by execution agent) demonstrates:
    1. Player without `controls` has NO controls.
    2. Player with `controls` has controls.
    3. Player with `autoplay` starts playing.
    4. Player with `loop` restarts at end.
- **Edge Cases**:
  - Loop while user is interacting (scrubbing)? The logic only triggers if `!state.isPlaying`, so scrubbing (which pauses) might be safe, but needs check.
