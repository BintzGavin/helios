# 2025-02-19-PLAYER-text-track-active-cues.md

#### 1. Context & Goal
- **Objective**: Implement `activeCues` property and `cuechange` event on `HeliosTextTrack` to achieve full Standard Media API parity.
- **Trigger**: The Journal identifies a "Standard Media API Parity Gap" regarding `HeliosTextTrack` being incomplete.
- **Impact**: Developers can now use standard TextTrack APIs (like listening for `cuechange` to render custom subtitles or trigger metadata events) without relying on proprietary Helios state.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/text-tracks.ts` (Implement `activeCues` logic)
- **Modify**: `packages/player/src/index.ts` (Drive `updateActiveCues` loop in `updateUI`)
- **Modify**: `packages/player/src/captions.test.ts` (Add verification tests for `activeCues` and events)

#### 3. Implementation Spec
- **Architecture**:
  - `HeliosTextTrack` will maintain an internal `_activeCues` state.
  - `HeliosPlayer` will drive the update loop by calling `track.updateActiveCues(currentTime)` inside its existing `updateUI` method (which runs on every frame/time update).
  - This ensures `activeCues` are always synchronized with the player's `currentTime`.

- **Pseudo-Code**:
  - **`HeliosTextTrack`**:
    - Add `_activeCues: HeliosCue[] | null`.
    - Implement `get activeCues()`: returns `_activeCues`.
    - Implement `set oncuechange(handler)`: standard event handler shim.
    - Implement `updateActiveCues(currentTime)`:
      - If `mode` is 'disabled', set `_activeCues` to null.
      - Else, filter `cues` where `startTime <= currentTime && endTime > currentTime`.
      - Compare new list with old list (shallow compare IDs or object ref).
      - If changed, update `_activeCues` and `dispatchEvent(new Event('cuechange'))`.

  - **`HeliosPlayer`**:
    - In `updateUI(state)`:
      - Calculate `currentTime = state.currentFrame / state.fps`.
      - Iterate `this._textTracks`.
      - Call `track.updateActiveCues(currentTime)`.

- **Public API Changes**:
  - `HeliosTextTrack.activeCues` is now functional (returns array/null instead of undefined).
  - `HeliosTextTrack` now emits `cuechange` events.
  - `HeliosTextTrack.oncuechange` property available.
  - **Note**: `HeliosCue` startTime/endTime are in seconds (standard), but internal cue storage might vary. `HeliosTextTrack` currently receives cues from `addCue`. If `addCue` gets seconds, it stores seconds. `HeliosPlayer` converts to milliseconds for `controller.setCaptions`. The comparison in `updateActiveCues` must use consistent units (Seconds). `HeliosPlayer` uses Seconds for `currentTime`.

#### 4. Test Plan
- **Verification**: `npx vitest run packages/player/src/captions.test.ts`
- **Success Criteria**:
  - Test confirms `activeCues` is null when track is disabled.
  - Test confirms `activeCues` contains correct cue when time is within range.
  - Test confirms `cuechange` event fires when entering/leaving cue range.
  - Test confirms `activeCues` updates even if track is `hidden` (not `showing`).
- **Edge Cases**:
  - Multiple overlapping cues.
  - Cues starting exactly at current time.
  - Seeking (jumping time) should update active cues correctly.
