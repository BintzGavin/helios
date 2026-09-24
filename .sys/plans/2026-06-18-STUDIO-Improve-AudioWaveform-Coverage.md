#### 1. Context & Goal
- **Objective**: Improve unit test coverage for the `useAudioWaveform` hook.
- **Trigger**: Backlog task to reach 100% test coverage across the studio package.
- **Impact**: Ensures robustness of the waveform peak extraction algorithm, especially around edge cases like unsupported audio contexts or extreme input values.

#### 2. File Inventory
- **Create**: (None)
- **Modify**: `packages/studio/src/hooks/useAudioWaveform.test.ts`
- **Read-Only**: `packages/studio/src/hooks/useAudioWaveform.ts`

#### 3. Implementation Spec
- **Architecture**: Update Vitest unit tests in JS/DOM environment for React hooks.
- **Pseudo-Code**:
  - Add a test for missing `OfflineAudioContext`:
    - Save original `window.OfflineAudioContext` (and webkit variant).
    - Delete them from `window`.
    - Render hook.
    - Verify `console.warn` is called and no peaks are returned.
    - Restore context.
  - Add a test for `extractPeaks` edge case where `samplesPerPeak < 1` (e.g. extremely low sample rate or high `peaksPerSecond`):
    - Mock `OfflineAudioContext` to return an `audioBuffer` with an artificially low `sampleRate` (e.g., 50) and test hook with standard `peaksPerSecond` (e.g., 100).
    - Assert that it returns an empty `Float32Array`.
  - Add test for `unmount` before promise resolves to test `active` flag check.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cd packages/studio && npx vitest run --coverage src/hooks/useAudioWaveform.test.ts`.
- **Success Criteria**: Coverage report shows 100% for `src/hooks/useAudioWaveform.ts`.
- **Edge Cases**: Missing audio context APIs, mathematically impossible peak resolution bounds, component unmount during fetch.
