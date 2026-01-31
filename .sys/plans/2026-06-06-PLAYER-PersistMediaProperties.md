# 2026-06-06-PLAYER-PersistMediaProperties.md

#### 1. Context & Goal
- **Objective**: Implement persistence for `volume` and `playbackRate` properties to ensure values set before the controller connects are applied upon initialization.
- **Trigger**: Vision Gap - "Standard Media API" parity. Currently, setting `player.volume` or `player.playbackRate` before the iframe loads results in those values being lost.
- **Impact**: Improves reliability of programmatic control, ensuring the player behaves like a standard `HTMLMediaElement` and reducing race conditions in integration code.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement persistence logic)
- **Modify**: `packages/player/src/index.test.ts` (Add verification tests)

#### 3. Implementation Spec
- **Architecture**: Introduce private state variables to store property values when the controller is not yet available.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    // Initialize with defaults (1.0)
    private _pendingVolume = 1;
    private _pendingPlaybackRate = 1;

    get volume() {
      // If controller is active, use its state (fallback to pending if undefined)
      // If controller is inactive, use pending value
      if (this.controller) {
        return this.controller.getState().volume ?? this._pendingVolume;
      }
      return this._pendingVolume;
    }

    set volume(val) {
      // Clamp value between 0 and 1
      const clamped = Math.max(0, Math.min(1, val));
      this._pendingVolume = clamped;

      if (this.controller) {
        this.controller.setAudioVolume(clamped);
      }
    }

    get playbackRate() {
      if (this.controller) {
        return this.controller.getState().playbackRate ?? this._pendingPlaybackRate;
      }
      return this._pendingPlaybackRate;
    }

    set playbackRate(val) {
      this._pendingPlaybackRate = val;
      if (this.controller) {
        this.controller.setPlaybackRate(val);
      }
    }

    private setController(controller) {
      // ... existing cleanup logic ...

      this.controller = controller;

      // ... existing event dispatch ...

      // Apply pending states to the new controller
      // We apply these explicitly to ensure the composition matches the player's state
      this.controller.setAudioVolume(this._pendingVolume);
      this.controller.setPlaybackRate(this._pendingPlaybackRate);

      // ... existing logic ...
    }
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New test case: `should apply pre-configured volume and playbackRate on connection` passes.
  - New test case: `should persist volume and playbackRate when set before load` passes.
  - Existing Standard Media API tests pass without regression.
- **Edge Cases**:
  - `volume` set to invalid values (check clamping).
  - `muted` attribute presence (should work alongside volume).
