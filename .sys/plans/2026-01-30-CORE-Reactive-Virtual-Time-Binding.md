# 2026-01-30-CORE-Reactive-Virtual-Time-Binding.md

## 1. Context & Goal
- **Objective**: Implement a reactive setter for `__HELIOS_VIRTUAL_TIME__` in `Helios.bindToDocumentTimeline()` to ensure immediate state updates in Renderer environments.
- **Trigger**: Backlog Item 8: "Fix GSAP Timeline Synchronization in SeekTimeDriver". The current polling loop via `requestAnimationFrame` introduces latency that causes `waitUntilStable` to resolve before subscriptions fire, breaking GSAP seeking in render mode.
- **Impact**: Enables precise frame synchronization for GSAP and other imperative animations during headless rendering, ensuring all elements are correctly positioned before frame capture.

## 2. File Inventory
- **Modify**:
  - `packages/core/src/index.ts` (Implement `defineProperty` setter for virtual time)
  - `packages/core/src/time-control.test.ts` (Add test case for reactive virtual time)
- **Read-Only**: `packages/core/src/drivers/DomDriver.ts`

## 3. Implementation Spec
- **Architecture**:
    - Enhance `bindToDocumentTimeline()` to detect if `__HELIOS_VIRTUAL_TIME__` is being used (Renderer mode).
    - If detected (or proactively), attempt to define `window.__HELIOS_VIRTUAL_TIME__` with a custom setter/getter.
    - When the setter is called (by Renderer), immediately trigger internal state update logic synchronously.
    - Extract state update logic into private method `updateFromExternalTime(timeMs: number)` to be shared by both the setter and the fallback polling loop.
    - Gracefully handle cases where property is already defined or non-configurable (fallback to polling).
- **Pseudo-Code**:
```typescript
  // New private method in Helios class
  private updateFromExternalTime(timeMs: number) {
      if (!Number.isFinite(timeMs)) return;
      const frame = (timeMs / 1000) * this._fps.value;
      if (frame !== this._currentFrame.peek()) {
           this._currentFrame.value = frame; // Triggers subscribers sync
      }
      this.driver.update(timeMs, {
        isPlaying: false,
        playbackRate: this._playbackRate.peek(),
        volume: this._volume.peek(),
        muted: this._muted.peek(),
        audioTracks: this._audioTracks.peek()
      });
  }

  public bindToDocumentTimeline() {
      // ... check document.timeline ...
      this.syncWithDocumentTimeline = true;

      // Try to hook global setter for instant updates
      if (typeof window !== 'undefined') {
          // Store existing value to avoid losing state or breaking logic
          let currentValue = (window as any).__HELIOS_VIRTUAL_TIME__;

          // Initial sync if value exists
          if (typeof currentValue === 'number') {
              this.updateFromExternalTime(currentValue);
          }

          try {
              Object.defineProperty(window, '__HELIOS_VIRTUAL_TIME__', {
                  configurable: true,
                  get: () => currentValue,
                  set: (val) => {
                      currentValue = val;
                      if (this.syncWithDocumentTimeline) {
                          this.updateFromExternalTime(val);
                      }
                  }
              });
          } catch (e) {
              // Fallback to polling if defineProperty fails (e.g. non-configurable)
          }
      }

      // Keep polling loop as fallback (e.g. for document.timeline or if setter fails)
      const poll = () => {
          if (!this.syncWithDocumentTimeline) return;
          // ... existing logic but using updateFromExternalTime ...
          requestAnimationFrame(poll);
      }
      requestAnimationFrame(poll);
  }
```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core` (Ensure no regressions).
- **Validation**:
    - Add a test case in `packages/core/src/time-control.test.ts`:
      ```typescript
      it('should update immediately when __HELIOS_VIRTUAL_TIME__ is set', () => {
          // Setup
          const helios = new Helios({ duration: 10, fps: 30 });
          // Mock window property if needed (jsdom supports it)
          Object.defineProperty(window, '__HELIOS_VIRTUAL_TIME__', {
              configurable: true,
              value: undefined,
              writable: true
          });

          helios.bindToDocumentTimeline();

          // Set virtual time
          (window as any).__HELIOS_VIRTUAL_TIME__ = 1000; // 1 second

          // Expect synchronous update (no wait)
          expect(helios.currentTime.value).toBe(1);
          expect(helios.currentFrame.value).toBe(30);

          helios.unbindFromDocumentTimeline();
      });
      ```
- **Success Criteria**:
    - Test passes confirming synchronous update.
    - Existing tests pass.
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
