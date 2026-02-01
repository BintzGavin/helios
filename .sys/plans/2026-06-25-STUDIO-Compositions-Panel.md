# 2026-06-25-STUDIO-Compositions-Panel

## 1. Context & Goal
- **Objective**: Implement a persistent "Compositions" panel in the Studio Sidebar to allow users to browse, create, duplicate, delete, and switch compositions without using the modal switcher.
- **Trigger**: Vision gap. The current "Composition Switcher" (Cmd+K) is a transient modal, lacking the persistence and management capabilities of a true IDE "Explorer" view.
- **Impact**: Improves project management workflow, making composition operations (create, duplicate, delete) more discoverable and accessible. Unifies the "Manage" experience alongside Assets and Renders.

## 2. File Inventory
- **Create**:
    - `packages/studio/src/components/CompositionsPanel/CompositionsPanel.tsx`: The new panel component.
    - `packages/studio/src/components/CompositionsPanel/CompositionsPanel.css`: Styles for the panel.
- **Modify**:
    - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add the new tab and render the panel.
    - `packages/studio/src/context/StudioContext.tsx`: Add state to support duplicating non-active compositions.
    - `packages/studio/src/components/DuplicateCompositionModal.tsx`: Update to use the new duplication target state.
- **Read-Only**:
    - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: For UI consistency reference.

## 3. Implementation Spec
- **Architecture**: React-based UI component (`CompositionsPanel`) integrated into the existing Sidebar tab system. It consumes `StudioContext` for data and actions.
- **Pseudo-Code**:
    - **StudioContext**:
        - Add `duplicateTargetId` state (string | null).
        - Expose `setDuplicateTargetId`.
    - **DuplicateCompositionModal**:
        - On mount (effect), check if `duplicateTargetId` is set.
        - If set, find that composition in the list.
        - Use it as the source for duplication (name preset: "Copy of [Name]").
        - If not set, fallback to `activeComposition`.
        - On close/submit, ensure `duplicateTargetId` is reset to null.
    - **CompositionsPanel**:
        - Render "Compositions" header with "New" button and "Search" input.
        - Filter `compositions` list based on search query.
        - Render list of compositions (grid or list layout).
        - Each item:
            - Thumbnail (using `thumbnailUrl`).
            - Name.
            - Click -> `setActiveComposition(comp)`.
            - Right Click / Actions Menu ->
                - Duplicate: `setDuplicateTargetId(comp.id); setDuplicateOpen(true);`
                - Delete: `confirm() && deleteComposition(comp.id);`
    - **Sidebar**:
        - Add "Compositions" button to tabs list.
        - Render `CompositionsPanel` when active.
        - Set default `activeTab` to 'compositions'.
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `npx helios studio`.
    - Verify "Compositions" tab is visible in Sidebar and active by default.
    - Verify list of compositions appears with correct thumbnails/names.
    - Click a composition -> Verify Stage updates to that composition.
    - Click "Duplicate" on a composition (different from active one) -> Verify Duplicate Modal opens with correct source name.
    - Verify duplication works and new composition appears in list.
    - Click "Delete" -> Verify confirmation and deletion.
    - Verify "New Composition" button opens the Create Modal.
- **Success Criteria**: Complete CRUD management of compositions from the Sidebar.
- **Edge Cases**:
    - No compositions (Show Empty State in panel).
    - Search with no results.
    - Delete active composition (App should handle graceful switch or empty state).
