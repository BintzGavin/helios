#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `SharedAudioContextManager` and `SharedAudioSource` classes.
- **Trigger**: The PLAYER domain currently has no feature gaps (Gravitational Equilibrium). Following the Regression Fallback guideline, we are prioritizing improving test coverage for critical components like the audio context manager.
- **Impact**: This ensures stability and prevents regressions in the shared audio infrastructure, which handles composition audio fades, metering, and user volume controls, unlocking safer refactoring in the future.

#### 2. File Inventory
- **Create**:
  - `packages/player/src/features/audio-context-manager.test.ts`: To house the unit tests for `SharedAudioSource` and `SharedAudioContextManager`.
- **Modify**: None.
- **Read-Only**:
  - `packages/player/src/features/audio-context-manager.ts`: The component being tested.

#### 3. Implementation Spec
- **Architecture**: Using Vitest to mock the browser's `AudioContext` API, including `MediaElementAudioSourceNode`, `GainNode`, and their connection graph, to verify the behavior of `SharedAudioSource` and `SharedAudioContextManager`.
- **Pseudo-Code**:
  - Mock the global `AudioContext` and `HTMLMediaElement`.
  - Test `SharedAudioContextManager.getInstance()` returns a singleton.
  - Test `SharedAudioContextManager.getSharedSource()` returns a cached `SharedAudioSource` for the same `HTMLMediaElement`.
  - Test `SharedAudioSource` initialization sets up the correct audio graph: `source -> fadeGainNode -> gainNode -> destination`.
  - Test `SharedAudioSource.syncVolume()` correctly maps `HTMLMediaElement.volume` and `HTMLMediaElement.muted` to the user `gainNode`.
  - Test `SharedAudioSource.setFadeGain()` calls `setTargetAtTime` on the `fadeGainNode` to prevent audio clicks.
  - Test `connect` and `disconnect` methods on `SharedAudioSource` appropriately connect/disconnect the `fadeGainNode` to the target node.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass, particularly the newly added `audio-context-manager.test.ts`, and test coverage for the audio features is improved.
- **Edge Cases**: Verify that `SharedAudioSource` gracefully ignores errors when disconnected from audio nodes during `connect`, `disconnect`, and `setFadeGain` operations.
