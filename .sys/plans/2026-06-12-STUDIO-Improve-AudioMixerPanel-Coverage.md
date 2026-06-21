#### 1. Context & Goal
- **Objective**: Improve test coverage for the `AudioMixerPanel` component.
- **Trigger**: Routine code coverage review identified uncovered lines in `src/components/AudioMixerPanel/AudioMixerPanel.tsx`.
- **Impact**: Increased test coverage improves reliability.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.test.tsx`
- **Read-Only**: `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx`

#### 3. Implementation Spec
- **Architecture**: Update Vitest tests.
- **Pseudo-Code**:
  - The uncovered lines in `AudioMixerPanel.tsx` are lines 23, 56-61, and 191.
  - Line 23: The error branch inside `fetchTracks`.
  - Line 56-61: The optimistic update branch inside `handleVolumeChange`.
  - Line 191: The volume slider onChange event handler.
  - Add a test that mocks `getAudioTracks` to reject, triggering the `console.error`.
  - Add a test that fires a `change` event on the volume slider for a track and verifies `setAudioTrackVolume` is called and the optimistic update occurs.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage`
- **Success Criteria**: Line and branch coverage for `AudioMixerPanel.tsx` reaches 100%.
- **Edge Cases**: Controller failing to get audio tracks.
