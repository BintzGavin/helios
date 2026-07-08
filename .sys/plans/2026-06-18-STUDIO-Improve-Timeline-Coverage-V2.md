#### 1. Context & Goal
- **Objective**: Improve test coverage for the `Timeline.tsx` component.
- **Trigger**: Backlog item requesting improved test coverage for STUDIO components.
- **Impact**: Increased reliability and stability for the timeline component.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/studio/src/components/Timeline.test.tsx`]
- **Read-Only**: [`packages/studio/src/components/Timeline.tsx`]

#### 3. Implementation Spec
- **Architecture**: Use `vitest` and `@testing-library/react`.
- **Pseudo-Code**:
  - Update `Timeline.test.tsx` to add tests for unreached branches and lines.
  - Test hover behaviors (mouse enter/leave over the track area) to trigger hover guide logic (around lines 350-360).
  - Test drag enter/leave over the timeline track to test the drag-over state.
  - Add missing marker iterations testing branches by ensuring props with no matches or empty schema/inputProps are checked properly.
  - Add test for dropping non-audio/video asset.
  - Add test for the `useEffect` cleanup handling `mousemove` and `mouseup` events on document to ensure full drag coverage.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage` and ensure coverage for `Timeline.tsx` hits or approaches 100%.
- **Success Criteria**: 100% test coverage or significantly improved coverage metrics reported for `Timeline.tsx`.
- **Edge Cases**: Ensure `contentRef.current` and missing props correctly hit `return` early branches.
