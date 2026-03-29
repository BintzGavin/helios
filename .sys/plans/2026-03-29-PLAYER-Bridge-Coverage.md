#### 1. Context & Goal
- **Objective**: Improve test coverage for `bridge.ts` in the `packages/player` domain, specifically targeting the missing handlers for `HELIOS_SET_PLAYBACK_RATE`, `HELIOS_SET_PLAYBACK_RANGE`, `HELIOS_CLEAR_PLAYBACK_RANGE`, `HELIOS_SET_VOLUME`, `HELIOS_SET_MUTED`, `HELIOS_SET_AUDIO_TRACK_VOLUME`, `HELIOS_SET_AUDIO_TRACK_MUTED`, `HELIOS_SET_LOOP`, `HELIOS_SET_PROPS`, `HELIOS_SET_CAPTIONS`, `HELIOS_SET_DURATION`, `HELIOS_SET_FPS`, `HELIOS_SET_SIZE`, `HELIOS_SET_MARKERS`, `HELIOS_GET_AUDIO_TRACKS`, `HELIOS_PLAY`, and `HELIOS_PAUSE`.
- **Trigger**: Based on `.sys/plans/2027-01-08-PLAYER-Bridge-Coverage-Expansion-2.md` and the missing `HELIOS_SET_*` handlers identified via `grep`, the domain has reached gravitational equilibrium, and the current goal is to improve test coverage.
- **Impact**: Full test coverage ensures that the bridge correctly passes messages from the parent window to the internal `Helios` instance, preventing future regressions.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/bridge.test.ts`
- **Read-Only**: `packages/player/src/bridge.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing Vitest test suite in `bridge.test.ts`.
- **Pseudo-Code**:
  - Add tests validating that triggering each specific message correctly calls the associated mocked `Helios` method.
  - Test the `HELIOS_GET_AUDIO_TRACKS` by mocking `getAudioAssets` and checking the `postMessage` call.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player -- --coverage`
- **Success Criteria**: Overall coverage percentage for `bridge.ts` should reach 100%, targeting the previously untested `HELIOS_SET_*` cases.
- **Edge Cases**: None.
