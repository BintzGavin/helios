#### 1. Context & Goal
- **Objective**: Improve test coverage for `AssetsPanel.tsx` by writing missing unit tests for drag-and-drop and breadcrumb functionality.
- **Trigger**: Test coverage run reveals `AssetsPanel.tsx` is at 56.7% line coverage, with lines 202-220, 231, and 253 not covered, representing drag-and-drop mechanics (`handleDragOver`, `handleDragLeave`, `handleDrop` for both internal moves and external file uploads) and breadcrumb navigation.
- **Impact**: Provides 100% robustness to Studio Asset Panel's drag-and-drop, search filter clearing on breadcrumb click, and prevents future regressions.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx` (Add test cases for `onDragOver`, `onDragLeave`, `onDrop` for both internal movement and external files, drop over `FolderItem`, breadcrumbs navigation).
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`

#### 3. Implementation Spec
- **Architecture**: Use Vitest and React Testing Library in `AssetsPanel.test.tsx`.
- **Pseudo-Code**:
  - Mock `moveAsset` in `useStudio`.
  - Test external file drop: Dispatch `drop` event with mocked `dataTransfer.files` to the main panel. Assert `uploadAsset` is called.
  - Test internal asset drop (move): Dispatch `drop` event with `dataTransfer.getData('application/helios-asset-id')` returning an ID. Drop it onto a `FolderItem`. Assert `moveAsset` is called.
  - Test breadcrumbs: Render at a specific subfolder path. Click breadcrumb part. Verify search query is reset and path changes.
  - Test `handleDragOver` preventing default and setting `isDragging` state (visually asserting drop overlay exists).
  - Test `handleDragLeave` to remove `isDragging` state.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `cd packages/studio && npx vitest run src/components/AssetsPanel/AssetsPanel.test.tsx --coverage`
- **Success Criteria**: Coverage for `AssetsPanel.tsx` increases to ~100%. All tests pass.
- **Edge Cases**: Dropping files at the root level, dropping files into specific folders.
