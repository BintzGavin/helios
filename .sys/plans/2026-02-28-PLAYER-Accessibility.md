# 📋 Plan: Accessibility Improvements

#### 1. Context & Goal
- **Objective**: Improve the accessibility of the `<helios-player>` Web Component by adding ARIA attributes, labels, and proper roles.
- **Trigger**: The current implementation lacks ARIA labels for buttons and the scrubber, making it unusable for screen reader users and non-compliant with standard Web Component practices.
- **Impact**: Enables screen reader support, improves keyboard navigation context, and aligns with the "Professional / Standard" vision for the component.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add ARIA attributes to template and update logic)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for ARIA attributes)

#### 3. Implementation Spec
- **Architecture**:
  - Update the Shadow DOM template to include static `aria-label` and `title` attributes.
  - Update `updateUI` method to dynamically update `aria-label` (for Play/Pause state) and `aria-valuetext` (for Scrubber time).
  - Ensure `iframe` has a descriptive `title`.
  - Add `role="toolbar"` to the controls container.
- **Pseudo-Code**:
  ```typescript
  // In template
  <iframe title="Helios Composition Preview">...</iframe>
  <div class="controls" role="toolbar" aria-label="Playback Controls">
    <button class="play-pause-btn" aria-label="Play">...</button>
    <input type="range" class="scrubber" aria-label="Seek time" ...>
    ...
  </div>

  // In updateUI(state)
  const time = (state.currentFrame / state.fps).toFixed(2);
  const total = state.duration.toFixed(2);
  // Update scrubber attributes
  this.scrubber.setAttribute('aria-valuetext', `${time} of ${total} seconds`);
  this.scrubber.setAttribute('aria-valuenow', String(state.currentFrame));
  this.scrubber.setAttribute('aria-valuemin', '0');
  this.scrubber.setAttribute('aria-valuemax', String(state.duration * state.fps));

  // Update play button label
  if (isFinished) {
      this.playPauseBtn.setAttribute('aria-label', 'Restart');
  } else {
      this.playPauseBtn.setAttribute('aria-label', state.isPlaying ? 'Pause' : 'Play');
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New tests in `index.test.ts` pass.
  - Tests confirm `aria-label` on Play/Pause button updates with state.
  - Tests confirm `aria-valuetext` on Scrubber updates with time.
  - Tests confirm `title` exists on iframe.
