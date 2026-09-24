#### 1. Context & Goal
- **Objective**: Improve test coverage for the `AudioMixerPanel` component by resolving `act()` warnings in its test suite.
- **Trigger**: Backlog/quality goal to ensure tests are free of warnings and test logic is properly asserting state updates, which also helps properly reach full coverage metrics for missing edge cases.
- **Impact**: Removes noisy test warnings, ensures tests reflect actual browser behavior, and fully validates AudioMixerPanel functionality, helping maintain high test reliability.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.test.tsx` (Wrap appropriate state-changing code, like mounting the component, within `act()` correctly and consistently, which has already been initially verified in trace).
- **Read-Only**: `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx`

#### 3. Implementation Spec
- **Architecture**: Ensure React state update patterns during tests align with React 18 standards (`act()`).
- **Pseudo-Code**:
  - Ensure all asynchronous calls (like `getAudioTracks`) resolve and component re-renders completely within an `act()` block or are waited on appropriately before interacting.
  - The test suite has already been updated to use `await act(async () => { renderComponent(); });`, however, `act()` warnings indicate state updates happen *after* `act()` finishes, meaning mock promises need to resolve, or interactions that trigger state updates (like fetch tracks or event listeners) need to be awaited correctly.
  - No new components or functions are required.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/studio -- --coverage src/components/AudioMixerPanel/AudioMixerPanel.test.tsx`
- **Success Criteria**: Tests pass without any `An update to AudioMixerPanel inside a test was not wrapped in act(...)` console warnings being output to stderr, and coverage is maintained or improved.
- **Edge Cases**: Verify that fetch error logging and cleanup logic still behaves appropriately under strict `act()` wrapping.
