#### 1. Context & Goal
- **Objective**: Implement `activeCues` and `cuechange` events in `HeliosTextTrack` to align with the Standard Media API.
- **Trigger**: Vision Gap - The README promises "Standard Media API" support, but `HeliosTextTrack` lacks `activeCues` and event dispatching, making it significantly less useful than standard `TextTrack` and breaking expectations for developers using standard patterns.
- **Impact**: Enables developers to build custom caption UI or trigger logic based on subtitles using standard web patterns (`track.activeCues`, `track.oncuechange`).

#### 2. File Inventory
- **Modify**: `packages/player/src/features/text-tracks.ts`
  - Add `activeCues` property (getter/setter or computed) to `HeliosTextTrack`.
  - Add `oncuechange` setter to `HeliosTextTrack`.
  - Add `updateActiveCues(time: number): boolean` method to calculate active cues and dispatch events.
- **Modify**: `packages/player/src/index.ts`
  - Update `HeliosPlayer.updateUI` (around line 1879) to iterate over text tracks and call `updateActiveCues` with the current time.

#### 3. Implementation Spec
- **Architecture**:
  - `HeliosTextTrack` will maintain an internal list of currently active cues (`_activeCues`).
  - `HeliosPlayer` drives the update loop via `updateUI` (which runs on every frame/time update), passing the current time to each track.
  - `HeliosTextTrack.updateActiveCues(currentTime)` filters `this.cues` based on `startTime <= currentTime < endTime`.
  - It compares the new list of active cues with `_activeCues`.
  - If the set of active cues changes (different length or different items):
    - Update `_activeCues`.
    - Dispatch a `cuechange` event on the `HeliosTextTrack` instance.
    - (Optional but recommended) Dispatch `cuechange` on the associated `<track>` element if it exists (via `_domTracks` mapping in `HeliosPlayer`? Or maybe just on the Track object as per spec).
      - *Note*: `HTMLMediaElement` fires `cuechange` on `TextTrack` objects. The `<track>` element also fires it. `HeliosPlayer` manages `_domTracks` map, so it could handle the element firing, or `HeliosTextTrack` could hold a reference to its element.
      - *Refinement*: For this task, strictly focusing on the `HeliosTextTrack` object parity is sufficient.
- **Public API Changes**:
  - `HeliosTextTrack.activeCues`: Returns an array (or array-like) of currently active cues.
  - `HeliosTextTrack.oncuechange`: Standard event handler property shim.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player` followed by a manual verification script.
- **Success Criteria**:
  - `track.activeCues` returns correct cues during playback.
  - `track.addEventListener('cuechange', ...)` fires when cues enter/exit.
  - `track.oncuechange` property works.
- **Edge Cases**:
  - No cues active (returns empty list).
  - Multiple overlapping cues (returns all).
  - Seeking (should update active cues immediately on next UI update).
  - Empty track (no errors).
