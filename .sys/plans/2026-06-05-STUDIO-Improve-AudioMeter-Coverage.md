#### 1. Context & Goal
- **Objective**: Add test coverage for `packages/studio/src/components/AudioMixerPanel/AudioMeter.tsx`.
- **Trigger**: Following the 'Nothing to Do Protocol', a scan of test coverage (`npm run test -w packages/studio -- --coverage`) revealed that lines 25, 27, 37, 39 in `AudioMeter.tsx` are not fully covered by tests.
- **Impact**: Improves the overall code quality and robustness of the `AudioMeter` component by ensuring all branches (especially the clipping/warning threshold color updates) are tested.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/AudioMixerPanel/AudioMeter.test.tsx`: Test file for the AudioMeter component.
- **Modify**: []
- **Read-Only**:
  - `packages/studio/src/components/AudioMixerPanel/AudioMeter.tsx`

#### 3. Implementation Spec
- **Architecture**:
  - Write a new unit test using `vitest` and `@testing-library/react`.
  - Use `useRef` and `act` to directly call the exposed `update` method on the `AudioMeterRef`.
  - Verify that the background colors update correctly for the clipping (`> 0.95`), warning (`> 0.8`), and normal scenarios on both the left and right channels.
- **Pseudo-Code**:
  - Render the `AudioMeter` component inside a wrapper that sets levels to 0.85 (warning) and 1.0 (clipping) using the exposed ref.
  - Assert the DOM contains the expected inline styles: `background-color: rgb(255, 179, 0)` for the warning level.
  - Assert the DOM contains the expected inline styles: `background-color: rgb(255, 82, 82)` for the clipping level.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage`
- **Success Criteria**:
  - The newly created test passes.
  - The coverage report for `AudioMeter.tsx` shows 100% (or significantly improved) line and branch coverage, specifically hitting the uncovered lines 25, 27, 37, 39.
- **Edge Cases**:
  - The imperative `update` method handles undefined refs gracefully (which the component handles via null checks, but good to ensure tests run smoothly).
