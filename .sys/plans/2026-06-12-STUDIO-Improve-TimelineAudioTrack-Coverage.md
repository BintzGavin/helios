#### 1. Context & Goal
- **Objective**: Improve test coverage for the `TimelineAudioTrack` component to 100%.
- **Trigger**: Routine code coverage review identified uncovered lines in `src/components/TimelineAudioTrack.tsx`.
- **Impact**: Full test coverage ensures reliability and prevents regressions.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/TimelineAudioTrack.test.tsx`
- **Read-Only**: `packages/studio/src/components/TimelineAudioTrack.tsx`

#### 3. Implementation Spec
- **Architecture**: Update Vitest tests.
- **Pseudo-Code**:
  - Add tests for edge cases to cover all branches in `useEffect` for `TimelineAudioTrack.tsx` (lines 49-77).
  - Add a test where `canvas.getContext('2d')` returns `null` to cover line 54.
  - Test drawing when peaks array has only a few elements vs canvas width.
  - The missing coverage is lines 49-77:
    - line 49: `if (!peaks || !canvasRef.current || trackWidthPx <= 0) return;`
    - line 53: `const ctx = canvas.getContext('2d');`
    - line 54: `if (!ctx) return;`
    - line 66-77: `for` loops inside the `useEffect`.
  - Adding test case where getContext returns null.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage`
- **Success Criteria**: Line and branch coverage for `TimelineAudioTrack.tsx` reaches 100%.
- **Edge Cases**: Missing canvas context, empty track width, no peaks.
