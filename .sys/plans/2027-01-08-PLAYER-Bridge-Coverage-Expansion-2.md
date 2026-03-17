#### 1. Context & Goal
- **Objective**: Add missing unit test coverage for `bridge.ts` message handling, particularly for `HELIOS_SEEK` and several `HELIOS_SET_*` commands.
- **Trigger**: The V2 Player architectural requirements and `bridge.ts` implementations demand robust coverage for the `postMessage` bridge. Currently, `HELIOS_SEEK`, `HELIOS_SET_VOLUME`, `HELIOS_SET_MUTED`, and several other bridge message handlers lack explicit test cases in `bridge.test.ts`.
- **Impact**: Increased test reliability, ensuring that the bridge handles all documented `postMessage` requests correctly.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/bridge.test.ts` - Add test cases for missing `HELIOS_SEEK`, `HELIOS_SET_PLAYBACK_RATE`, `HELIOS_SET_PLAYBACK_RANGE`, `HELIOS_CLEAR_PLAYBACK_RANGE`, `HELIOS_SET_VOLUME`, `HELIOS_SET_MUTED`, `HELIOS_SET_AUDIO_TRACK_VOLUME`, `HELIOS_SET_AUDIO_TRACK_MUTED`, `HELIOS_SET_LOOP`, `HELIOS_SET_PROPS`, `HELIOS_SET_CAPTIONS`, `HELIOS_PAUSE`, `HELIOS_GET_AUDIO_TRACKS`.
- **Read-Only**: `packages/player/src/bridge.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing Vitest test suite in `bridge.test.ts`.
- **Pseudo-Code**:
  - Add new test blocks to send mock `postMessage` events for `HELIOS_SEEK`, ensuring `requestAnimationFrame` resolves correctly to dispatch `HELIOS_SEEK_DONE`.
  - Add tests verifying the mock `Helios` methods are called with correct arguments for remaining commands like `setPlaybackRate`, `setPlaybackRange`, `clearPlaybackRange`, `setAudioVolume`, `setAudioMuted`, `setAudioTrackVolume`, `setAudioTrackMuted`, `setLoop`, `setInputProps`, `setCaptions`, `pause`, and `getAudioAssets`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cd packages/player && npm run test -- --coverage`
- **Success Criteria**: Line coverage for `packages/player/src/bridge.ts` should improve towards 100%.
- **Edge Cases**: None.
