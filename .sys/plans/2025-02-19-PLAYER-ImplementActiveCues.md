# Plan: Implement ActiveCues and CueChange Event

## 1. Context & Goal
- **Objective**: Implement `activeCues` property and `cuechange` event in `HeliosTextTrack` to align with the Standard Media API.
- **Trigger**: Vision gap identified - `HeliosTextTrack` is incomplete, missing standard mechanisms for tracking active cues over time.
- **Impact**: Enables developers to build custom caption renderers or side-effects based on standard `cuechange` events, improving interoperability.

## 2. File Inventory
- **Modify**: `packages/player/src/features/text-tracks.ts` (Implement `activeCues`, `oncuechange`, `updateActiveCues`)
- **Modify**: `packages/player/src/index.ts` (Drive `updateActiveCues` loop in `updateUI`)
- **Modify**: `packages/player/src/api_parity.test.ts` (Add verification tests)

## 3. Implementation Spec

### Architecture
- **HeliosTextTrack**:
  - Add `_activeCues` state (Array/List).
  - Add `get activeCues()` returning the list.
  - Add `set oncuechange(handler)` setter.
  - Add `updateActiveCues(currentTime: number)` method:
    - Filters `_cues` where `startTime <= currentTime` and `endTime >= currentTime`.
    - Detects changes against `_activeCues` (by comparing length and IDs/content).
    - Updates `_activeCues` and dispatches `cuechange` event if changed.
- **HeliosPlayer**:
  - In `updateUI(state)`, calculate `currentTime` (`currentFrame / fps`).
  - Iterate over `this._textTracks`.
  - Call `track.updateActiveCues(currentTime)` for each track.

### Pseudo-Code

#### `packages/player/src/features/text-tracks.ts`

```typescript
export class HeliosTextTrack extends EventTarget {
  // ... existing props
  private _activeCues: any[] = []; // Using Array as simplified TextTrackCueList

  get activeCues() { return this._activeCues; }

  set oncuechange(handler: ((event: any) => void) | null) {
      if (handler) {
          this.addEventListener('cuechange', handler);
      } else {
          // Note: removing specific handler is hard with this setter pattern without tracking it,
          // but strictly speaking setter adds. Standard behavior clears old "oncuechange" listener.
          // For simplicity/parity with onaddtrack shim, we just add.
          // Ideally we should manage the "on" property listener separately.
      }
  }

  updateActiveCues(currentTime: number) {
     if (this.mode === 'disabled') {
        if (this._activeCues.length > 0) {
           this._activeCues = [];
        }
        return;
     }

     // Helios uses seconds for TextTrack, but internal cues might vary?
     // HeliosCue in this file uses standard number.
     // Assuming currentTime is in seconds.

     const newActive = this._cues.filter(c => c.startTime <= currentTime && c.endTime >= currentTime);

     // Simple change detection
     let changed = newActive.length !== this._activeCues.length;
     if (!changed) {
         for (let i = 0; i < newActive.length; i++) {
             if (newActive[i] !== this._activeCues[i]) {
                 changed = true;
                 break;
             }
         }
     }

     if (changed) {
        this._activeCues = newActive;
        this.dispatchEvent(new Event('cuechange'));
     }
  }
}
```

#### `packages/player/src/index.ts`

```typescript
// in updateUI(state)
// ... existing code ...

const currentTime = state.fps ? state.currentFrame / state.fps : 0;
// Iterate over all tracks (including hidden ones) to update their active state
for (const track of this._textTracks) {
   track.updateActiveCues(currentTime);
}

// ... existing code ...
```

### Dependencies
- None.

## 4. Test Plan
- **Verification**: `cd packages/player && npx vitest run src/api_parity.test.ts`
- **Success Criteria**:
  - `track.activeCues` returns correct cues at given time.
  - `cuechange` event fires when entering/leaving cue time range.
  - `activeCues` is empty when mode is 'disabled'.
- **Edge Cases**:
  - Multiple overlapping cues.
  - Seeking (jumping time) correctly updates active cues.
  - Track mode changes (disabled -> hidden should update active cues on next tick).
