#### 1. Context & Goal
- **Objective**: Improve test coverage for `packages/studio/src/components/Timeline.tsx` by clearing `draggingPropKey` on `handleMouseUp`.
- **Trigger**: Test coverage report indicates coverage missing in Timeline component. Specifically around dragging props. Currently the component resets `isDragging` but not `draggingPropKey`. We should also reset `draggingPropKey` to avoid lingering state.
- **Impact**: Better state management and test coverage for the component.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/Timeline.tsx`
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: In `Timeline.tsx`, inside `handleMouseUp`, reset the internal state tracking which property is currently being dragged to null, preventing it from remaining active after the user has released the mouse button.
- **Pseudo-Code**:
  - Update `handleMouseUp` in `Timeline.tsx`:
    - Call the state setter to clear `isDragging`.
    - Call the state setter to clear `draggingPropKey`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test --workspace=packages/studio -- --coverage`
- **Success Criteria**: Coverage for `Timeline.tsx` increases and reaches 100% or significantly improves. The tests pass.
- **Edge Cases**: None
