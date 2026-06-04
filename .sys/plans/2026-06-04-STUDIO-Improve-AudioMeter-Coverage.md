#### 1. Context & Goal
- **Objective**: Improve test coverage for the `AudioMeter` component in `packages/studio`.
- **Trigger**: Backlog cleanup to improve overall component test coverage in Studio.
- **Impact**: Increased test coverage reduces the likelihood of regressions in future updates and ensures UI reliability.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/AudioMixerPanel/AudioMeter.test.tsx` - New test file to achieve 100% test coverage for AudioMeter.
- **Modify**: []
- **Read-Only**:
  - `packages/studio/src/components/AudioMixerPanel/AudioMeter.tsx`

#### 3. Implementation Spec
- **Architecture**: Create standard Vitest/React Testing Library tests for the `AudioMeter` component to test edge cases, missing lines, and component states.
- **Pseudo-Code**:
  - Render `AudioMeter` and keep a ref to it.
  - Invoke the `update` method on the ref directly.
  - Test normal levels (<= 0.8), warning levels (> 0.8), and clip levels (peak > 0.95) for both left and right channels to cover the branch logic assigning background colors (`#4caf50`, `#ffb300`, `#ff5252`).
  - Assert that the bars render with the correct height percentage and background color in the DOM.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage src/components/AudioMixerPanel/AudioMeter.tsx`
- **Success Criteria**: Coverage for `AudioMeter.tsx` reaches 100%.
- **Edge Cases**: Test when audio meter levels change color thresholds.
