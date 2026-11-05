#### 1. Context & Goal
- **Objective**: Improve test coverage for the `Timeline` component to reach 100% by testing missing branches on marker clicks and mouse tracking.
- **Trigger**: `vitest --coverage` indicated `packages/studio/src/components/Timeline.tsx` is missing coverage on lines ~280-305 (mouse tracking) and ~507-522 (In/Out markers).
- **Impact**: Improves the reliability of the Timeline component's drag-and-drop, track hovering, and marker functionalities.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/Timeline.test.tsx`
- **Read-Only**: `packages/studio/src/components/Timeline.tsx`

#### 3. Implementation Spec
- **Architecture**: In `Timeline.test.tsx`, add test cases to explicitly hit the missing branches:
  1. Hover functionality (`handleTrackMouseMove`, `handleTrackMouseLeave`): Fire `mouseMove` and `mouseLeave` on `.timeline-content` when not dragging.
  2. Dragging "In" point (`handleMouseDown` with type "in", followed by `mouseMove`).
  3. Dragging "Out" point (`handleMouseDown` with type "out", followed by `mouseMove`).
- **Pseudo-Code**:
  - Add test `it('shows hover guide when moving mouse over track area', ...)`
    - Trigger `fireEvent.mouseMove(content)` and assert hover text/guide appears.
    - Trigger `fireEvent.mouseLeave(content)` and assert hover guide disappears.
  - Add test `it('allows dragging In and Out markers', ...)`
    - Query `.timeline-marker.in` and `.timeline-marker.out`.
    - Fire `mouseDown` on "in" marker, dispatch `mouseMove` on document, assert `setInPoint` is called with bounded new frame.
    - Reset, fire `mouseDown` on "out" marker, dispatch `mouseMove` on document, assert `setOutPoint` is called.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test --workspace=packages/studio -- packages/studio/src/components/Timeline.test.tsx --coverage`
- **Success Criteria**: `Timeline.tsx` reaches 100% test coverage.
- **Edge Cases**: Out point boundary crossing In point, and vice-versa.
