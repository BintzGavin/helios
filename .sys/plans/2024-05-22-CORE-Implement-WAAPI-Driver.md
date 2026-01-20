## 1. Context & Goal
- **Objective**: Implement a mechanism in `Helios` to drive the browser's Web Animations API (WAAPI) by synchronizing animation `currentTime` with the internal frame state.
- **Source**: Derived from README: "Helios avoids this by leveraging the browser's native Web Animations API... it sets the timeline's current time programmatically".

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts`
- **Modify**: `packages/core/src/index.test.ts`
- **Read-Only**: `README.md`

## 3. Implementation Spec
- **Architecture**:
  - Extend `HeliosOptions` to include an `autoSyncAnimations` boolean flag (default `false` to avoid unexpected side effects).
  - Implement a private method `syncDomAnimations()` that iterates through `document.getAnimations()` and sets their `currentTime`.
  - Invoke `syncDomAnimations()` within `seek()` and `tick()` if the flag is enabled.
  - Ensure animations are paused when controlled by Helios to prevent conflict.
- **Pseudo-Code**:
  ```typescript
  // In Helios class
  private autoSyncAnimations: boolean;

  constructor(options: HeliosOptions) {
      // ...
      this.autoSyncAnimations = options.autoSyncAnimations || false;
  }

  private syncDomAnimations(timeInMs: number) {
      if (typeof document === 'undefined' || !document.getAnimations) return;

      document.getAnimations().forEach(anim => {
          anim.currentTime = timeInMs;
          // Ensure it doesn't auto-play if we are driving it
          if (anim.playState !== 'paused') {
              anim.pause();
          }
      });
  }

  // Update seek()
  public seek(frame: number) {
      // ... existing logic ...
      if (this.autoSyncAnimations) {
          this.syncDomAnimations((newFrame / this.state.fps) * 1000);
      }
  }

  // Update tick()
  private tick = () => {
      // ... existing logic ...
      if (this.autoSyncAnimations) {
          this.syncDomAnimations((nextFrame / this.state.fps) * 1000);
      }
  }
  ```
- **Public API Changes**:
  - `HeliosOptions` adds `autoSyncAnimations?: boolean`.

## 4. Test Plan
- **Verification**: `npm test packages/core` (using vitest).
- **Success Criteria**:
  - New test case in `index.test.ts` where `document.getAnimations` is mocked.
  - Verify that `seek()` calls `currentTime` setter on mocked animations.
  - Verify that `play()` (via `tick`) updates `currentTime` on mocked animations.
