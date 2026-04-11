#### 1. Context & Goal
- **Objective**: Improve test coverage for `audio-metering.ts`.
- **Trigger**: The PLAYER domain has reached gravitational equilibrium with the documented vision. The current fallback action is to improve test coverage per governance laws.
- **Impact**: Increases test reliability and edge-case handling for the audio metering feature.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/player/src/features/audio-metering.test.ts`]
- **Read-Only**: [`packages/player/src/features/audio-metering.ts`]

#### 3. Implementation Spec
- **Architecture**: Expand the existing Vitest suite for `AudioMeter`.
- **Pseudo-Code**:
  - Add test case verifying that `getLevels()` returns zeroes when disabled.
  - Add test case verifying that `getLevels()` correctly calculates RMS and Peak values by mocking `getFloatTimeDomainData`.
  - Add test case verifying that `connectElement` logs a warning if `getSharedSource` throws.
  - Add test case verifying that `dispose` catches and logs errors if disconnects fail.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx vitest run --coverage packages/player`
- **Success Criteria**: The coverage for `audio-metering.ts` increases and all tests pass.
- **Edge Cases**: Ensure tests cover scenarios with missing contexts or failing node connections.
