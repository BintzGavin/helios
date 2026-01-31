# Context & Goal
- **Objective**: Implement a `bindTo(master: Helios)` method in the `Helios` class to allow one instance to strictly synchronize its timeline and playback state with another.
- **Trigger**: Vision gap "Timeline Synchronization" - the README and prompt identify the need to coordinate multiple compositions.
- **Impact**: Enables multi-composition scenarios (e.g., Picture-in-Picture, complex layouts) where secondary compositions must stay in sync with a master timeline during preview and playback.

# File Inventory
- **Modify**: `packages/core/src/index.ts`
  - Add `bindTo(master: Helios)` method.
  - Update `unbind()` (or add `unbindFromHelios` and consolidate) to clean up subscriptions.
  - Add private `_syncDispose` property.
- **Modify**: `packages/core/src/index.test.ts`
  - Add unit tests verifying synchronization of `currentFrame`, `isPlaying`, and `playbackRate`.

# Implementation Spec
- **Architecture**: Use the Observer Pattern via Signals (`effect`). The "slave" instance will subscribe to the "master" instance's `currentTime`, `isPlaying`, and `playbackRate` signals.
- **Public API Changes**:
  - `public bindTo(master: Helios): void`
  - `public unbind(): void` (Enhance existing `unbindFromDocumentTimeline` logic or create a general `unbind` that handles both).
- **Pseudo-Code**:
```typescript
class Helios {
  private _syncDispose: (() => void) | null = null;

  public bindTo(master: Helios) {
    this.disposeSync(); // Clear existing
    this.unbindFromDocumentTimeline(); // Exclusive
    this.ticker.stop(); // Stop self-ticking

    this._syncDispose = effect(() => {
       const time = master.currentTime.value;
       const fps = this._fps.value;
       const masterPlaying = master.isPlaying.value;
       const masterRate = master.playbackRate.value;

       // Sync state
       this._currentFrame.value = time * fps;
       this._isPlaying.value = masterPlaying;
       this._playbackRate.value = masterRate;

       // Update driver immediately
       this.driver.update(time * 1000, {
         isPlaying: masterPlaying,
         playbackRate: masterRate,
         volume: this._volume.peek(),
         muted: this._muted.peek(),
         audioTracks: this._audioTracks.peek()
       });
    });
  }

  public unbind() {
     this.disposeSync();
     this.unbindFromDocumentTimeline();
  }

  private disposeSync() {
    if (this._syncDispose) {
      this._syncDispose();
      this._syncDispose = null;
    }
  }
}
```

# Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `test('Helios syncs with master')`: Create `h1` and `h2`. `h2.bindTo(h1)`. `h1.seek(10)`. Assert `h2.currentFrame` matches (adjusted for FPS if needed).
  - `test('Helios syncs playback state')`: `h1.play()`. Assert `h2.isPlaying` is true. `h1.pause()`. Assert `h2.isPlaying` is false.
  - Verify unbind stops updates.
- **Edge Cases**:
  - Binding to self (throw error?).
  - Different FPS (Sync by time implies `frame = time * fps`. Test this conversion).
