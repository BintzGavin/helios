#### 1. Context & Goal
- **Objective**: Add comprehensive regression tests for the `AudioFader` feature to ensure its DOM mutation observing and gain calculations are robustly verified.
- **Trigger**: The PLAYER domain is currently blocked waiting for a new plan (as noted in `docs/BACKLOG.md`). The fallback protocol, per `.jules/PLAYER.md`, mandates improving test coverage. `audio-fader.ts` handles complex DOM interactions for audio fades.
- **Impact**: This prevents future regressions in the `AudioFader` class by locking down its interactions with the `SharedAudioContextManager` and `MutationObserver`.

#### 2. File Inventory
- **Create**:
  - `None`
- **Modify**:
  - `packages/player/src/features/audio-fader.test.ts` (Add more edge cases)
- **Read-Only**:
  - `packages/player/src/features/audio-fader.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the existing Vitest suite in `audio-fader.test.ts` to cover additional edge cases and branch logic.
- **Pseudo-Code**:
  - Add tests for suspended audio context resuming (mocking context state).
  - Add tests for edge cases like missing attributes, invalid floats, or negative durations.
  - Add tests for node cleanup behavior when an element is removed but remains referenced elsewhere.
  - Test disabling/enabling cycle explicitly checking for RAF cancellation.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cd packages/player && npm install --no-save --workspaces=false && npm run test`
- **Success Criteria**: All tests, including the newly added `AudioFader` regression tests, pass.
- **Edge Cases**: Ensure the tests do not crash if globals are manipulated improperly. Verify exact math in fade overlap scenarios.