#### 1. Context & Goal
- **Objective**: Improve test coverage for the Stage Toolbar and Playback Controls components.
- **Trigger**: The STUDIO domain is currently in equilibrium with all README vision features implemented. Following the Regression Fallback protocol, this task focuses on adding test coverage to critical components.
- **Impact**: Increased stability and regression prevention for core Studio UI elements.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/Stage/StageToolbar.test.tsx` (New test file for StageToolbar)
- **Modify**:
  - `packages/studio/src/components/Controls/PlaybackControls.test.tsx` (Add test coverage for playback rate changes, play/pause behavior, frame stepping, and null controller edge cases)
- **Read-Only**:
  - `packages/studio/src/components/Stage/StageToolbar.tsx`
  - `packages/studio/src/components/Controls/PlaybackControls.tsx`

#### 3. Implementation Spec
- **Architecture**: Use Vitest, React Testing Library, and the existing `render` test utils to mount components. Mock `useStudio` context to provide deterministic state.
- **Pseudo-Code**:
  - For `StageToolbar.test.tsx`: Write tests asserting that the correct zoom values are displayed, preset canvas sizes update the state, and buttons (Fit, Transparent, Guides) call their respective props.
  - For `PlaybackControls.test.tsx`: Add missing test cases to cover `handleSpeedChange`, `handlePlayPause`, `handlePrevFrame`, `handleNextFrame`, `handleRewind`, and ensure disabled state when `controller` is `null`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run test -w packages/studio`
- **Success Criteria**: Vitest outputs `StageToolbar.test.tsx` and `PlaybackControls.test.tsx` as passing.
- **Edge Cases**: Verify behavior when `controller` is null in `PlaybackControls`.
