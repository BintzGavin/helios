# 2026-02-18-STUDIO-interactive-timeline-captions.md

#### 1. Context & Goal
- **Objective**: Implement interactive caption markers on the Timeline that, when clicked, select the caption and open the Captions Panel for editing.
- **Trigger**: "Vision Gap: WYSIWYG editing experience". Currently, captions are visible on the Timeline but static; users must manually find them in the Captions Panel to edit.
- **Impact**: Improves the editing workflow by linking the visual timeline representation directly to the editing interface, closing the loop between preview and control.

#### 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add `activeSidebarTab`, `selectedCaptionId` state)
- **Modify**: `packages/studio/src/components/Sidebar/Sidebar.tsx` (Consume tab state from Context instead of local state)
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Add click handler to caption markers, highlight selected)
- **Modify**: `packages/studio/src/components/Timeline.css` (Add styles for selected caption marker)
- **Modify**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx` (Highlight selected caption, auto-scroll to it)
- **Modify**: `packages/studio/src/components/CaptionsPanel/CaptionsPanel.css` (Add styles for selected caption item)

#### 3. Implementation Spec
- **Architecture**: Lift `activeSidebarTab` state from `Sidebar` to `StudioContext` to allow `Timeline` to control it. Add `selectedCaptionId` to `StudioContext` to sync selection state between `Timeline` and `CaptionsPanel`.
- **Pseudo-Code**:
  - **StudioContext**:
    - Add `activeSidebarTab` state (use `usePersistentState` internally, default 'compositions').
    - Add `selectedCaptionId` state (string | null).
    - Expose setters: `setActiveSidebarTab`, `setSelectedCaptionId`.
  - **Sidebar**:
    - Remove local `usePersistentState`.
    - Use `useStudio().activeSidebarTab` and `setActiveSidebarTab`.
  - **Timeline**:
    - In `render` loop for captions:
      - Check if `cue.id === selectedCaptionId`.
      - Add `.selected` class if true.
      - Add `onMouseDown` (stopPropagation):
        - `setSelectedCaptionId(cue.id)`
        - `setActiveSidebarTab('captions')`
    - In `handleMouseDown` (background):
      - `setSelectedCaptionId(null)`
  - **CaptionsPanel**:
    - Use `useRef` map (or dynamic ref callback) for caption DOM items.
    - `useEffect` on `selectedCaptionId`:
      - If match found in refs, call `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
    - Render:
      - Add `.selected` class to matching item.

- **Public API Changes**: None (Internal Studio Context changes only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1.  Run `npm run test -w packages/studio src/context/StudioContext.test.tsx` to verify context logic.
  2.  Run `npx helios studio` (via `npm run dev`).
  3.  Upload an SRT file or add captions manually.
  4.  Verify captions appear on Timeline.
  5.  Click a caption marker on the Timeline.
  6.  **Success Criteria**:
      - The sidebar switches to "Captions" tab (if not already active).
      - The corresponding caption in the list is highlighted.
      - The list scrolls to show the selected caption.
      - The timeline marker remains highlighted.
  7.  Click the timeline background.
  8.  **Success Criteria**: The caption is deselected.
- **Edge Cases**:
  - Captions without IDs (fallback to index temporarily or ensure ID exists).
  - Deleting the selected caption (ensure `selectedCaptionId` is cleared or handled).
