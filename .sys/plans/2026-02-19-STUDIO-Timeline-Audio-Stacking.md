#### 1. Context & Goal
- **Objective**: Implement visual stacking of audio tracks in the Timeline to prevent overlap and utilize the available vertical space.
- **Trigger**: Vision Gap ("Visual timeline"). Currently, audio tracks overlap blindly in a fixed 80px container, making it impossible to distinguish overlapping sounds.
- **Impact**: Unlocks basic audio editing visualization, allowing users to see the structure of their composition's audio.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Update render logic to stack tracks and dynamic sizing.
  - `packages/studio/src/components/Timeline.css`: Update layout to support dynamic height and scrolling.
  - `packages/studio/src/App.tsx`: Ensure Timeline container fills available height.
- **Read-Only**:
  - `packages/studio/src/components/Timeline.test.tsx`: For verification context.

#### 3. Implementation Spec
- **Architecture**:
  - React `useMemo` to compute layout (rows) for audio tracks based on temporal overlap.
  - Flexbox/Grid adjustments in `App.tsx` and `Timeline.css` to allow the Timeline component to expand vertically into the 300px panel.
- **Pseudo-Code (Timeline.tsx)**:
  ```typescript
  // Algorithm:
  // 1. Sort tracks by startTime.
  // 2. Assign each track to the first available row where startTime >= rowEndTime + buffer.
  // 3. Calculate contentHeight based on maxRow.

  // Rendering:
  // Render tracks with `top` calculated as: BASE_TOP_PX + (row * TRACK_HEIGHT).
  // Render container with `height: contentHeight`.
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/studio`.
- **Success Criteria**:
  - Unit tests in `Timeline.test.tsx` pass.
  - New test case `stacks overlapping audio tracks` (to be added by implementer) passes.
  - Visual verification: Open Studio, load composition with overlapping audio, confirm tracks stack and scrollbar appears if needed.
- **Edge Cases**:
  - Zero audio tracks.
  - Large number of tracks (scroll).
  - Exact overlap start times.
