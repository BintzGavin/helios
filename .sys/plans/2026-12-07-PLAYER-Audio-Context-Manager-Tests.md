# 2026-12-07-PLAYER-Audio-Context-Manager-Tests

## 1. Context & Goal
- **Objective**: Improve test coverage for the PLAYER domain by writing unit tests for `SharedAudioSource` and `SharedAudioContextManager`.
- **Trigger**: The PLAYER domain currently has no feature gaps (Gravitational Equilibrium). Following the Regression Fallback guideline, we are prioritizing improving test coverage for critical components like the audio context manager.
- **Impact**: This will ensure stability and prevent regressions in audio context management, node connections, and volume synchronization.

## 2. File Inventory
- **Create**:
  - `packages/player/src/features/audio-context-manager.test.ts`: Contains the new unit tests.
- **Modify**: []
- **Read-Only**:
  - `packages/player/src/features/audio-context-manager.ts`: Target implementation file to understand the class behavior.

## 3. Implementation Spec
- **Architecture**:
  - Implement unit tests using Vitest in `packages/player/src/features/audio-context-manager.test.ts`.
  - Use mock implementations for `HTMLMediaElement` and `AudioContext` to isolate the logic.
  - Test the singleton pattern of `SharedAudioContextManager`.
  - Test `SharedAudioSource` constructor and volume synchronization on initialization.
  - Test `SharedAudioSource` listener on `volumechange` event.
  - Test `SharedAudioSource` `setFadeGain` with `setTargetAtTime` mocking.
  - Test `SharedAudioSource` `connect` and `disconnect` methods with mock audio nodes.
- **Pseudo-Code**:
  ```typescript
  // Mock HTMLMediaElement
  // Mock AudioContext and related nodes (GainNode, MediaElementAudioSourceNode)

  // describe('SharedAudioContextManager', ...)
  // - it('should return a singleton instance', ...)
  // - it('should return the same SharedAudioSource for the same element', ...)

  // describe('SharedAudioSource', ...)
  // - it('should initialize nodes and connections correctly', ...)
  // - it('should sync volume initially', ...)
  // - it('should sync volume on volumechange event', ...)
  // - it('should handle muted state during syncVolume', ...)
  // - it('should set fade gain via setTargetAtTime', ...)
  // - it('should connect node to fadeGainNode', ...)
  // - it('should disconnect node from fadeGainNode', ...)
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm run test -w packages/player -- packages/player/src/features/audio-context-manager.test.ts` from the workspace root. Alternatively run `npm install --no-save --workspaces=false && npm run test` inside `packages/player`.
- **Success Criteria**: All new tests should pass without errors.
- **Edge Cases**:
  - `SharedAudioSource.setFadeGain` handles errors gracefully.
  - `SharedAudioSource.connect` handles errors gracefully.
  - `SharedAudioSource.disconnect` handles errors gracefully.
