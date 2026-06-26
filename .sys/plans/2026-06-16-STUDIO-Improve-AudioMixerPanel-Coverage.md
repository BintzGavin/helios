#### 1. Context & Goal
- **Objective**: Improve test coverage for `AudioMixerPanel.tsx` and `DiagnosticsModal.tsx` by covering missing lines.
- **Trigger**: Coverage report reveals uncovered lines in `AudioMixerPanel.tsx` (fetch failure, missing track mute, volume change logic) and `DiagnosticsModal.tsx` (act wrapper warnings, edge cases).
- **Impact**: Increases test reliability and maintains high test coverage standard for UI components without creating new features.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.test.tsx` (Add new tests for volume change, mute invalid track, fetch rejection, and add act wrappers to existing tests)
  - `packages/studio/src/components/DiagnosticsModal.test.tsx` (Add act wrappers around renders and fireEvents that trigger state updates to fix stderr warnings, and cover remaining lines)
- **Read-Only**: `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx`, `packages/studio/src/components/DiagnosticsModal.tsx`

#### 3. Implementation Spec
- **Architecture**: Standard Vitest and React Testing Library update.
- **Pseudo-Code**:
  - In `AudioMixerPanel.test.tsx`, add test: "handles volume change slider". Find slider for track-1, fire event to change value, verify `mockController.setAudioTrackVolume` was called.
  - Add test: "handles fetch errors gracefully". Mock `getAudioTracks` to reject, assert that console.error is called (after spying on it).
  - Wrap existing `renderComponent` calls that trigger initial data fetches or async state updates in `act` blocks, or ensure `await waitFor` correctly resolves all state updates to prevent "not wrapped in act" warnings.
  - In `DiagnosticsModal.test.tsx`, wrap state-changing events (like `fireEvent.click`) in `act()` where appropriate to eliminate console warnings. Verify coverage for lines 15, 42. (Line 15: `if (!isOpen) return null;` which is mostly covered, and Line 42: likely error handling or close logic).
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- src/components/AudioMixerPanel/AudioMixerPanel.test.tsx src/components/DiagnosticsModal.test.tsx --coverage`
- **Success Criteria**: Line coverage reaches 100% for `AudioMixerPanel.tsx` and `DiagnosticsModal.tsx`. No "not wrapped in act" console warnings.
- **Edge Cases**: Mock console.error to avoid polluting test output during the intentional fetch failure test.
