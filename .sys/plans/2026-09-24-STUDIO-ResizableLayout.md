# Context & Goal
- **Objective**: Implement a resizable layout system for the Studio (Sidebar, Inspector, Timeline) to allow users to customize their workspace dimensions.
- **Trigger**: The current layout uses fixed CSS Grid dimensions (250px/300px), preventing users from viewing wide inputs or maximizing the stage/timeline, which is a critical "IDE" feature gap.
- **Impact**: Significantly improves UX by adapting to different screen sizes and user workflows (e.g., audio editing vs. prop tweaking) and persists user preferences.

# File Inventory
- **Create**:
  - `packages/studio/src/components/Layout/Resizer.tsx`: Generic drag handler component.
  - `packages/studio/src/components/Layout/Resizer.css`: Styles for the drag handle (hover/active states).
- **Modify**:
  - `packages/studio/src/components/Layout/StudioLayout.tsx`: Introduce state for layout dimensions and insert Resizer components.
  - `packages/studio/src/components/Layout/StudioLayout.css`: Convert hardcoded grid tracks to CSS variables.
- **Read-Only**:
  - `packages/studio/src/App.tsx`: Context for usage (no changes needed if StudioLayout handles its own state).

# Implementation Spec
- **Architecture**:
  - `StudioLayout` becomes a stateful component (using `useState` and `useEffect` for persistence).
  - State: `sidebarWidth`, `inspectorWidth`, `timelineHeight`.
  - Initial values loaded from `localStorage` (keys: `helios-layout-sidebar`, etc.) with fallbacks.
  - Grid container receives inline styles: `style={{ '--sidebar-width': sidebarWidth + 'px', ... }}`.
  - `<Resizer />` components are placed between grid areas (e.g., between sidebar and stage).
  - `Resizer` attaches global `mousemove`/`mouseup` listeners on `mousedown` to calculate delta and update state.

- **Pseudo-Code**:
  ```typescript
  // Resizer.tsx
  export const Resizer = ({ onResize, direction = 'horizontal' }) => {
    const handleMouseDown = (e) => {
      e.preventDefault();
      const start = direction === 'horizontal' ? e.clientX : e.clientY;

      const handleMove = (moveEvent) => {
         const current = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
         onResize(current - start);
      };

      const handleUp = () => {
         window.removeEventListener('mousemove', handleMove);
         window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    };

    return <div className={`resizer ${direction}`} onMouseDown={handleMouseDown} />;
  };

  // StudioLayout.tsx
  export const StudioLayout = ({ ...props }) => {
     const [sidebarW, setSidebarW] = useState(() => load('sidebar', 250));

     const handleResizeSidebar = (delta) => {
        setSidebarW(prev => Math.max(150, Math.min(600, prev + delta)));
     };

     return (
       <div className="studio-layout" style={{ '--sidebar-width': `${sidebarW}px`, ... }}>
          <aside className="area-sidebar">...</aside>
          <Resizer onResize={handleResizeSidebar} />
          ...
       </div>
     );
  };
  ```

- **CSS Changes**:
  ```css
  .studio-layout {
    grid-template-columns: var(--sidebar-width, 250px) 1fr var(--inspector-width, 300px);
    grid-template-rows: 40px 1fr var(--timeline-height, 300px);
  }
  ```

# Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Hover over the border between Sidebar and Stage -> Cursor should change to `col-resize`.
  3. Drag the border -> Sidebar should resize, Stage should adjust.
  4. Drag Timeline border -> Timeline should resize vertically.
  5. Reload page -> Dimensions should be restored from `localStorage`.
- **Success Criteria**:
  - Layout is resizable.
  - Dimensions persist across reloads.
  - Layout does not break at minimum sizes (clamped).
