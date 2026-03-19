#### 1. Context & Goal
- **Objective**: Improve test coverage for `HeliosVideoTrackList` and `HeliosAudioTrackList` event handlers.
- **Trigger**: Test coverage reports show missing coverage for lines related to `onremovetrack` and `onchange` setters/getters in `video-tracks.ts` and `audio-tracks.ts`.
- **Impact**: Ensures that standard HTMLMediaElement event handler properties (`onaddtrack`, `onremovetrack`, `onchange`) work correctly and prevents regressions.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/features/video-tracks.test.ts`: Add test cases for `onremovetrack` and `onchange` properties on `HeliosVideoTrackList`.
  - `packages/player/src/features/audio-tracks.test.ts`: Add test cases for `onremovetrack` and `onchange` properties on `HeliosAudioTrackList`.
- **Read-Only**:
  - `packages/player/src/features/video-tracks.ts`
  - `packages/player/src/features/audio-tracks.ts`

#### 3. Implementation Spec
- **Architecture**: N/A - updating unit tests.
- **Pseudo-Code**:
  - For `video-tracks.test.ts`:
    - In `HeliosVideoTrackList` describe block:
      - Add test `should support onremovetrack event handler property`:
        - Set `list.onremovetrack` to a spy.
        - Add a track to the list.
        - Call `list.removeTrack(track)`.
        - Verify spy is called.
        - Verify removing listener works (set `list.onremovetrack = null`, call `removeTrack` again, spy not called again).
      - Add test `should support onchange event handler property`:
        - Set `list.onchange` to a spy.
        - Call `list.dispatchChangeEvent()`.
        - Verify spy is called.
        - Verify removing listener works (set `list.onchange = null`, call `dispatchChangeEvent` again, spy not called again).
  - For `audio-tracks.test.ts`:
    - In `HeliosAudioTrackList` describe block:
      - Implement tests identically to `video-tracks.test.ts` for `onremovetrack` and `onchange`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cd packages/player && npm run test -- --coverage`
- **Success Criteria**: Coverage for `video-tracks.ts` and `audio-tracks.ts` reaches 100% or close to it, specifically targeting the previously uncovered lines for `onremovetrack` and `onchange` property getters/setters.
- **Edge Cases**: Ensure removing handlers functions correctly (testing setter with `null`).
