# 1. Context & Goal
- **Objective**: Implement `activeCues` property and `cuechange` event on `HeliosTextTrack` to achieve parity with the Standard Media API.
- **Trigger**: The current implementation of `HeliosTextTrack` is missing `activeCues` and does not dispatch `cuechange` events, which creates a false promise of "Standard Media API" support as noted in the status file gap.
- **Impact**: Enables developers to build accessible UI and metadata-driven features (like interactive transcripts or synchronized events) using standard HTML5 patterns.

# 2. File Inventory
- **Create**:
    - `packages/player/src/features/text-tracks.test.ts`: Unit tests for `HeliosTextTrack` logic.
- **Modify**:
    - `packages/player/src/features/text-tracks.ts`: Add `activeCues` property and `updateActiveCues` method.
    - `packages/player/src/index.ts`: Update `HeliosPlayer` to drive track updates on every time update.
- **Read-Only**:
    - `packages/player/src/features/caption-parser.ts`

# 3. Implementation Spec
- **Architecture**:
    - `HeliosTextTrack` will maintain an internal `_activeCues` array.
    - `HeliosPlayer` (the host) acts as the time-source. On every `timeupdate` (via `updateUI` loop), it calls `track.updateActiveCues(currentTime)` on all valid tracks.
    - `updateActiveCues` filters the full `cues` list for cues overlapping `currentTime`.
    - If the set of active cues changes (diff check), it updates `_activeCues` and dispatches a `cuechange` event.
- **Public API Changes**:
    - `HeliosTextTrack.activeCues`: Now returns an array (or Array-like object) of currently active cues.
    - `HeliosTextTrack` now emits `cuechange` events.
    - `HeliosPlayer` logic update (internal behavior change).
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: Run `npm test` in `packages/player`.
- **Success Criteria**:
    - New unit test `text-tracks.test.ts` passes, verifying `activeCues` updates and event emission.
    - `api_parity.test.ts` should be updated/verified to check for `activeCues` existence (if not already checking).
- **Edge Cases**:
    - Track mode 'disabled' should not update active cues.
    - Cues with zero duration.
    - Cues ending exactly on the current time boundary.
    - Rapid seeking (should update active cues immediately).
