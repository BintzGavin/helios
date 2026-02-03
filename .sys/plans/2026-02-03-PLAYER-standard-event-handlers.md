# 2026-02-03-PLAYER-standard-event-handlers

#### 1. Context & Goal
- **Objective**: Implement standard behavior for event handler properties (`onaddtrack`, `onremovetrack`, `onchange`) in `HeliosTextTrackList` and `HeliosAudioTrackList`.
- **Trigger**: Discovery that current implementation either accumulates listeners (Audio) or is missing them (Text), violating Standard Media API parity.
- **Impact**: Ensures developers using standard API patterns don't encounter memory leaks or duplicate event firings.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/text-tracks.ts` (Implement getters/setters for `onaddtrack`, `onremovetrack`, `onchange`)
- **Modify**: `packages/player/src/features/audio-tracks.ts` (Fix `onaddtrack`, `onremovetrack`, `onchange` to use replacement pattern)
- **Modify**: `packages/player/src/features/text-tracks.test.ts` (Add tests for `HeliosTextTrackList` events)
- **Modify**: `packages/player/src/features/audio-tracks.test.ts` (Add tests for `HeliosAudioTrackList` events)

#### 3. Implementation Spec
- **Architecture**: Use the standard EventTarget pattern where setting an `on*` property removes the previously assigned listener and adds the new one.
- **Pseudo-Code**:
  ```typescript
  class HeliosTrackList extends EventTarget {
    private _onaddtrack: ((event: Event) => void) | null = null;

    get onaddtrack() { return this._onaddtrack; }
    set onaddtrack(handler) {
      if (this._onaddtrack) this.removeEventListener('addtrack', this._onaddtrack);
      this._onaddtrack = handler;
      if (handler) this.addEventListener('addtrack', handler);
    }
    // Repeat for onremovetrack, onchange
  }
  ```
- **Public API Changes**: `HeliosTextTrackList` and `HeliosAudioTrackList` will correctly expose `onaddtrack`, `onremovetrack`, `onchange` as properties.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx vitest run packages/player/src/features/text-tracks.test.ts packages/player/src/features/audio-tracks.test.ts`
- **Success Criteria**:
  - Tests pass confirming `onaddtrack = fn` replaces previous `onaddtrack`.
  - Tests pass confirming setting to `null` removes listener.
  - No duplicate event firings.
- **Edge Cases**:
  - Setting same handler twice.
  - Setting to null/undefined.
