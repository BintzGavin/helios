#### 1. Context & Goal
- **Objective**: Fix incomplete event handler properties (`onaddtrack`, `onremovetrack`, `onchange`) in `HeliosAudioTrackList` and `HeliosTextTrackList`, and ensure `change` events are dispatched when track states (mode/enabled) change.
- **Trigger**: Review of `packages/player/src/features` revealed "stub" implementations that accumulate listeners instead of replacing them, and missing `change` event dispatching for user-initiated state changes.
- **Impact**: Ensures `HeliosPlayer` behaves correctly as a Standard Media API consumer, preventing memory leaks (listener accumulation) and ensuring apps using `onchange` receive updates.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/text-tracks.ts` (Implement `onchange`, `onremovetrack`, fix `onaddtrack`, add `dispatchChangeEvent`)
- **Modify**: `packages/player/src/features/audio-tracks.ts` (Fix `onaddtrack`, `onremovetrack`, `onchange`)
- **Modify**: `packages/player/src/index.ts` (Dispatch change events in `handleTrackModeChange` and `handleAudioTrackEnabledChange`)

#### 3. Implementation Spec
- **Architecture**:
    - Update `HeliosTextTrackList` and `HeliosAudioTrackList` to manage private `_on[event]` handlers.
    - Implement setters to remove old listener and add new one (standard pattern).
    - Add `dispatchChangeEvent()` to `HeliosTextTrackList`.
    - Update `HeliosPlayer` to call `dispatchChangeEvent()` on the respective list when `track.mode` (Text) or `track.enabled` (Audio) changes.
- **Public API Changes**:
    - `HeliosTextTrackList`: Added `onchange` and `onremovetrack` properties.
    - `HeliosTextTrackList`, `HeliosAudioTrackList`: Event handler properties now correctly replace previous handlers.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
    - Unit tests pass verifying `onaddtrack` replacement (assign twice, fire once).
    - Unit tests pass verifying `change` event fires on `textTracks` when `track.mode` changes.
    - Unit tests pass verifying `change` event fires on `audioTracks` when `track.enabled` changes.
- **Edge Cases**:
    - Setting handler to `null` removes the listener.
    - Changing mode/enabled to the *same* value should not fire event (handled by setter checks).
