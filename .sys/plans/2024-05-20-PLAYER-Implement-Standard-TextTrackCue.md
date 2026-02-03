#### 1. Context & Goal
- **Objective**: Implement standard `TextTrackCue` (with `id`, `track`, `pauseOnExit`) and `TextTrackCueList` in `packages/player` to achieve true Standard Media API parity.
- **Trigger**: Discovery that `HeliosTextTrack` returns raw arrays instead of `TextTrackCueList`, `HeliosCue` is missing standard properties, and the internal caption parser drops IDs.
- **Impact**: Enables developers to reliably use cue IDs for interaction and ensures compatibility with standard video wrapper libraries that expect spec-compliant `TextTrack` interfaces.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/text-tracks.ts` (Implement `HeliosTextTrackCueList`, update `HeliosCue` and `HeliosTextTrack`)
- **Modify**: `packages/player/src/features/caption-parser.ts` (Update `parseSRT` and `parseWebVTT` to capture IDs)
- **Modify**: `packages/player/src/api_parity.test.ts` (Add tests for `TextTrackCueList` and `id` support)

#### 3. Implementation Spec
- **Architecture**:
    - `HeliosCue` will be updated to implement the `TextTrackCue` interface (and `VTTCue` properties), adding `id`, `track`, and `pauseOnExit`.
    - `HeliosTextTrackCueList` class will be created to implement `TextTrackCueList` (iterable, indexed access, `getCueById`).
    - `HeliosTextTrack` will be updated to expose `cues` and `activeCues` as `HeliosTextTrackCueList` instances instead of raw arrays.
    - `caption-parser` will be updated to extract IDs from SRT and WebVTT blocks.

- **Pseudo-Code**:
    In `packages/player/src/features/text-tracks.ts`:

    Define `HeliosCue` class:
    - Add `id` (string), `track` (HeliosTextTrack | null), `pauseOnExit` (boolean).
    - Ensure `startTime`, `endTime`, `text` remain.

    Define `HeliosTextTrackCueList` class:
    - Store internal array of cues.
    - Implement `length` getter.
    - Implement `getCueById(id)` method.
    - Implement `[Symbol.iterator]` and indexed access (via Proxy or explicit index getters if Proxy not feasible/desired, though Proxy is better for dynamic lists). *Note: Since `TextTrackCueList` is live, we might need a way to update it. Or just re-create it when cues change (simpler, but less efficient). Better: `HeliosTextTrackCueList` wraps the internal array of the track.*

    Update `HeliosTextTrack` class:
    - Change `_cues` and `_activeCues` to be managed such that `cues` and `activeCues` getters return `HeliosTextTrackCueList`.
    - When adding/removing cues, ensure `cue.track` is updated.

    In `packages/player/src/features/caption-parser.ts`:
    - Update `SubtitleCue` interface to include optional `id`.
    - Update `parseSRT` regex/logic to capture ID line.
    - Update `parseWebVTT` regex/logic to capture ID line.

- **Public API Changes**:
    - `HeliosTextTrack.cues` returns `HeliosTextTrackCueList`.
    - `HeliosTextTrack.activeCues` returns `HeliosTextTrackCueList`.
    - `HeliosCue` properties `id`, `track`, `pauseOnExit` added.
    - `parseCaptions` returns objects with `id`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**:
    - `api_parity.test.ts` tests confirm `player.textTracks[0].cues` has `getCueById`.
    - Tests confirm imported SRT/VTT captions have correct IDs.
    - `track` property on cues points back to the track.
- **Edge Cases**:
    - `getCueById` returns null if not found.
    - Empty cue list handles length 0.
    - Adding a cue sets its `track` property. removing clears it.
