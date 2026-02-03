# 2025-02-18-PLAYER-TextTrackParity

#### 1. Context & Goal
- **Objective**: Implement `activeCues` property and `cuechange` event on `HeliosTextTrack` to achieve Standard Media API parity.
- **Trigger**: Vision gap identified in `docs/status/PLAYER.md` ("Standard Media API Parity Gap") and `README.md`.
- **Impact**: Enables external consumers (UI overlays, accessibility tools) to react to caption timing events using standard web APIs, matching `HTMLMediaElement` behavior.

#### 2. File Inventory
- **Create**: `packages/player/src/features/text-tracks.test.ts` (Unit tests for validating `activeCues` and `cuechange`)
- **Modify**: `packages/player/src/features/text-tracks.ts` (Implement `activeCues`, `oncuechange`, and `updateActiveCues` method)
- **Modify**: `packages/player/src/index.ts` (Update `HeliosPlayer.updateUI` to drive track updates)
- **Read-Only**: `packages/player/src/features/caption-parser.ts`

#### 3. Implementation Spec
- **Architecture**:
  - The `HeliosTextTrack` class acts as the state container and event emitter.
  - The `HeliosPlayer` acts as the "Time Driver" (similar to how `HTMLMediaElement` drives its tracks).
  - On every `timeupdate` (frame), the player pushes the new time to all tracks via `updateActiveCues(time)`.
  - Tracks internally filter their cues and determine if the "active" set has changed.
  - `HeliosTextTrackCueList` will be implemented as a subclass of `Array` to satisfy `TextTrack.activeCues` interface (which requires `length` and index access, plus `getCueById`).

- **Pseudo-Code**:
  ```typescript
  // packages/player/src/features/text-tracks.ts

  export class HeliosTextTrackCueList extends Array {
    getCueById(id: string) {
      return this.find(c => c.id === id) || null;
    }
  }

  export class HeliosTextTrack extends EventTarget {
    // ... existing properties
    private _activeCues: HeliosTextTrackCueList = new HeliosTextTrackCueList();

    get activeCues(): HeliosTextTrackCueList {
      return this._activeCues;
    }

    set oncuechange(handler: (event: Event) => void) {
      this.addEventListener('cuechange', handler);
    }

    updateActiveCues(currentTime: number) {
      // Filter cues that overlap currentTime
      const active = this._cues.filter(cue =>
        currentTime >= cue.startTime && currentTime < cue.endTime
      );

      // Check for changes (simple length check + id comparison)
      const changed = active.length !== this._activeCues.length ||
                      active.some((c, i) => c !== this._activeCues[i]);

      if (changed) {
        this._activeCues = new HeliosTextTrackCueList(...active);
        this.dispatchEvent(new Event('cuechange'));
      }
    }
  }
  ```

  ```typescript
  // packages/player/src/index.ts

  // inside updateUI(state)
  const currentTime = state.currentFrame / state.fps; // Seconds
  for (const track of this._textTracks) {
      // Cast to any if updateActiveCues is not yet on the interface in the loop
      track.updateActiveCues(currentTime);
  }
  ```

- **Public API Changes**:
  - `HeliosTextTrack.activeCues` (New Getter)
  - `HeliosTextTrack.oncuechange` (New Setter)
  - `HeliosTextTrack.updateActiveCues(time)` (New Method - technically internal to package but public on class)

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `text-tracks.test.ts` passes.
  - Test case: Add cues [0-1s], [2-3s]. Set time to 0.5s -> `activeCues` has 1 item, `cuechange` fired.
  - Test case: Set time to 1.5s -> `activeCues` empty, `cuechange` fired.
  - Test case: Set time to 2.5s -> `activeCues` has 1 item, `cuechange` fired.
- **Edge Cases**:
  - Simultaneous cues (should both be in activeCues).
  - Seeking (jumping from 0 to 2.5) should update correctly.
