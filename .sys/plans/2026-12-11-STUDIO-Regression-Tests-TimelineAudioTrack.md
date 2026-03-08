#### 1. Context & Goal
- **Objective**: Implement regression tests for `TimelineAudioTrack` component and `useAudioWaveform` hook.
- **Trigger**: The Studio domain has reached gravitational equilibrium (all features aligned with vision). A fallback action is required: Regression testing.
- **Impact**: Ensures that audio waveforms render deterministically on the timeline and future changes won't break visualization logic.

#### 2. File Inventory
- **Create**: `packages/studio/src/components/TimelineAudioTrack.test.tsx` (Regression tests for TimelineAudioTrack rendering logic).
- **Create**: `packages/studio/src/hooks/useAudioWaveform.test.ts` (Regression tests for the waveform calculation logic).
- **Modify**: `docs/status/STUDIO.md` (Log completion of the regression tests).
- **Modify**: `docs/PROGRESS-STUDIO.md` (Update progress log).
- **Read-Only**: `packages/studio/src/components/TimelineAudioTrack.tsx`, `packages/studio/src/hooks/useAudioWaveform.ts`, `packages/studio/package.json`.

#### 3. Implementation Spec
- **Architecture**: Use `vitest` and `@testing-library/react` for unit and regression testing. Mock `useAudioWaveform` inside the component test to control `peaks` return value.
- **Pseudo-Code**:
  - `TimelineAudioTrack.test.tsx`:
    - Setup: Provide `AudioTrackMetadata` mocks and mock `getPercent`.
    - Test 1: Given a `track` starting at `0` and ending at `5` seconds, ensure the DOM sets left/width percentages properly based on `getPercent`.
    - Test 2: Given a mocked `peaks` array of numbers, test that the `CanvasRenderingContext2D` draws the right number of lines corresponding to the peaks.
  - `useAudioWaveform.test.ts`:
    - Setup: Mock global `AudioContext` and `fetch`.
    - Test 1: Valid src resolves audio buffer and extracts peaks appropriately.
    - Test 2: Error cases return an empty peaks array and don't crash.
- **Public API Changes**: None.
- **Dependencies**: No external agent dependencies. Only depends on testing tools already present in the Studio package.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- packages/studio/src/components/TimelineAudioTrack.test.tsx packages/studio/src/hooks/useAudioWaveform.test.ts`
- **Success Criteria**: All new Vitest unit tests pass successfully, coverage increases for waveform logic.
- **Edge Cases**: Handling missing src or empty/short audio peaks arrays without breaking layout.