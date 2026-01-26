# 1. Context & Goal
- **Objective**: Add touch event listeners (`touchstart`, `touchend`, `touchcancel`) to the `<helios-player>` scrubber to ensure smooth seeking interaction on mobile devices.
- **Trigger**: Vision Gap - "Use the platform" implies support for standard input methods like Touch, which is currently missing (scrubber relies on `mousedown` only).
- **Impact**: Enables mobile users to scrub the timeline without playback jitter (fighting between play head and seek), improving the UX to match native player expectations.

# 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add event listeners)
- **Modify**: `packages/player/src/index.test.ts` (Add unit tests for touch events)

# 3. Implementation Spec
- **Architecture**: Extend the existing event handling pattern. The `scrubber` element (`<input type="range">`) already has handlers for `handleScrubStart` (pause) and `handleScrubEnd` (resume). We will map Touch events to these same handlers.
- **Pseudo-Code**:
  ```typescript
  // In connectedCallback
  this.scrubber.addEventListener("touchstart", this.handleScrubStart, { passive: true });
  this.scrubber.addEventListener("touchend", this.handleScrubEnd);
  this.scrubber.addEventListener("touchcancel", this.handleScrubEnd);

  // In disconnectedCallback (cleanup)
  this.scrubber.removeEventListener("touchstart", this.handleScrubStart);
  this.scrubber.removeEventListener("touchend", this.handleScrubEnd);
  this.scrubber.removeEventListener("touchcancel", this.handleScrubEnd);
  ```
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: Run `npm test -w packages/player`
- **Success Criteria**: New tests in `index.test.ts` pass, confirming that `touchstart` triggers `pause()` and `touchend` triggers `play()` (if previously playing).
- **Edge Cases**: Verify `touchcancel` also resumes playback (handles interruptions like alerts).
