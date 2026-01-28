# Context & Goal
- **Objective**: Implement visualization of Composition Markers in the Studio Timeline.
- **Trigger**: `Helios` Core supports named `markers` (with time, label, color), but Studio Timeline currently ignores them, creating a gap between the engine's capabilities and the authoring tool.
- **Impact**: Users can see and navigate to named points in time (e.g., "Intro", "Drop", "Chorus") defined in their composition, improving the navigation and editing experience.

# File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx`
  - Update `PlayerState` interface to include `markers: Marker[]`.
  - Update `DEFAULT_PLAYER_STATE` to include empty markers array.
- **Modify**: `packages/studio/src/components/Timeline.tsx`
  - Render markers on the track.
  - Implement click-to-seek functionality for markers.
- **Modify**: `packages/studio/src/components/Timeline.css`
  - Add styles for `.timeline-marker-comp` (composition marker) to distinguish from in/out markers.
- **Read-Only**: `packages/core/src/markers.ts`
  - Reference for `Marker` interface.

# Implementation Spec
- **Architecture**:
  - Extend `PlayerState` in `StudioContext` to include `markers: Marker[]` (imported from `@helios-project/core`).
  - Since `HeliosController.subscribe` already pushes the full `HeliosState` (which includes markers), the data flow will automatically populate this new field once the interface is updated.
  - In `Timeline`, map over `playerState.markers` and render them.
  - Markers will be rendered as distinct elements (e.g., diamonds or colored lines) on the timeline track.
  - Hovering a marker will show its label (via `title` attribute or custom tooltip).
  - Clicking a marker will call `controller.seek(marker.time * fps)`.
  - Use the `color` property from the `Marker` object if present, defaulting to a system color (e.g., `#ff9800`) if not.

- **Pseudo-Code**:
  ```typescript
  // StudioContext.tsx
  import type { Marker } from '@helios-project/core';
  export interface PlayerState {
    // ... existing fields
    markers: Marker[];
  }
  const DEFAULT_PLAYER_STATE: PlayerState = {
    // ... existing defaults
    markers: []
  };

  // Timeline.tsx
  const markers = playerState.markers || [];

  // Helper to calculate position
  const getPercent = (frame: number) => { ... };

  // Inside JSX
  {markers.map((m) => (
    <div
      key={m.id}
      className="timeline-marker-comp"
      style={{
        left: `${getPercent(m.time * fps)}%`,
        backgroundColor: m.color || '#ff9800'
      }}
      title={`${m.label} (${m.id})`}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (controller) controller.seek(m.time * fps);
      }}
    />
  ))}
  ```

- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Create a temporary composition in `examples/` that defines markers:
     ```typescript
     const helios = new Helios({
       // ...
       markers: [
         { id: 'start', time: 0, label: 'Start', color: '#00ff00' },
         { id: 'mid', time: 5, label: 'Middle', color: '#ffff00' }
       ]
     });
     ```
  2. Run `npx helios studio` (or `npm run dev` in studio package).
  3. Load the composition.
  4. Verify markers appear on the timeline at 0s and 5s.
  5. Verify markers have correct colors (Green, Yellow).
  6. Hover to verify labels ("Start", "Middle").
  7. Click "Middle" marker and verify playhead jumps to 5s.
- **Success Criteria**:
  - Markers are rendered correctly.
  - Seek interaction works.
  - No TypeScript errors.
- **Edge Cases**:
  - No markers defined (Timeline should render normally without errors).
  - Markers beyond duration (should be handled by timeline clamping or just rendered off-screen/clipped).
