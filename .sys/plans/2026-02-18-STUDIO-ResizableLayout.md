# Context & Goal
- **Objective**: Implement resizable panels for the Studio Sidebar, Inspector, and Timeline, persisting their dimensions across sessions.
- **Trigger**: The current fixed layout (250px Sidebar, 300px Inspector, 300px Timeline) is inflexible, causing content truncation on small screens and wasted space on large monitors.
- **Impact**: Enhances the "IDE-like" experience by allowing users to customize their workspace to fit their content (e.g., widening the Props Editor for complex JSON, or the Timeline for many tracks).

# File Inventory
- **Create**:
  - `packages/studio/src/components/Layout/ResizeHandle.tsx`: A reusable drag handle component.
  - `packages/studio/src/components/Layout/ResizeHandle.css`: Styles for the drag handle (cursor, hover state).
- **Modify**:
  - `packages/studio/src/components/Layout/StudioLayout.tsx`: Lift grid dimensions to state and integrate handles.
  - `packages/studio/src/components/Layout/StudioLayout.css`: Remove fixed grid definitions in favor of inline styles.
- **Read-Only**:
  - `packages/studio/src/hooks/usePersistentState.ts`: To persist layout dimensions.

# Implementation Spec
- **Architecture**:
  - The `StudioLayout` will maintain three state variables: `sidebarWidth`, `inspectorWidth`, and `timelineHeight`.
  - These values will be persisted to `localStorage` via `usePersistentState`.
  - The CSS Grid layout will be applied via `style={{ gridTemplateColumns: ..., gridTemplateRows: ... }}` on the container.
  - `ResizeHandle` components will be placed in the relevant grid areas to capture mouse drag events.
  - **Constraints**: Minimum dimensions will be enforced (e.g., Sidebar min 200px, Timeline min 100px) to prevent layout collapse.
- **Pseudo-Code**:
  ```tsx
  // ResizeHandle.tsx
  // Component that renders a div (handle).
  // On mousedown:
  //   - Adds window 'mousemove' and 'mouseup' listeners.
  //   - Prevents text selection (user-select: none on body).
  // On mousemove:
  //   - Calculates delta (e.clientX - startX or e.clientY - startY).
  //   - Calls onResize(delta).
  // On mouseup:
  //   - Removes listeners.

  // StudioLayout.tsx
  const [sidebarWidth, setSidebarWidth] = usePersistentState('layout-sidebar-width', 250);
  const [inspectorWidth, setInspectorWidth] = usePersistentState('layout-inspector-width', 300);
  const [timelineHeight, setTimelineHeight] = usePersistentState('layout-timeline-height', 300);

  return (
    <div className="studio-layout" style={{
       gridTemplateColumns: `${sidebarWidth}px 1fr ${inspectorWidth}px`,
       gridTemplateRows: `40px 1fr ${timelineHeight}px`
    }}>
      <aside className="area-sidebar" style={{ position: 'relative' }}>
         {sidebar}
         <ResizeHandle
            orientation="vertical"
            onResize={(d) => setSidebarWidth(w => Math.max(200, w + d))}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize' }}
         />
      </aside>
      <aside className="area-inspector" style={{ position: 'relative' }}>
         <ResizeHandle
            orientation="vertical"
            onResize={(d) => setInspectorWidth(w => Math.max(250, w - d))} // Negative delta expands
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize' }}
         />
         {inspector}
      </aside>
      <footer className="area-timeline" style={{ position: 'relative' }}>
         <ResizeHandle
            orientation="horizontal"
            onResize={(d) => setTimelineHeight(h => Math.max(100, h - d))} // Negative delta expands
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', cursor: 'row-resize' }}
         />
         {timeline}
      </footer>
    </div>
  )
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Drag the sidebar handle (right edge of sidebar) to widen it.
  3. Drag the inspector handle (left edge of inspector) to widen it.
  4. Drag the timeline handle (top edge of timeline) to heighten it.
  5. Reload the page.
  6. Verify the new dimensions are preserved.
- **Success Criteria**:
  - Panels resize smoothly during drag.
  - Layout state persists across reloads.
  - Dragging feels responsive and "native".
  - Content within panels reflows correctly (e.g., flex containers).
- **Edge Cases**:
  - Dragging beyond window bounds (clamping).
  - Dragging below minimum width (clamping).
  - Rapid mouse movement (handle should not lose capture).
