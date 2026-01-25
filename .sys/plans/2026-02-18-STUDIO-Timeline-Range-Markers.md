# 2026-02-18-STUDIO-Timeline-Range-Markers.md

#### 1. Context & Goal
- **Objective**: Implement a visual timeline with draggable in/out markers to define render ranges and keyboard shortcuts ('I'/'O').
- **Trigger**: Vision Gap - "Timeline scrubber with in/out markers to define render ranges" (README.md).
- **Impact**: Enables users to define the specific portion of the composition they want to render, bridging the gap between the player and the renderer.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/Timeline.css`: Styles for the new timeline component.
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`: Add `inPoint`/`outPoint` to state and update `startRender` signature.
  - `packages/studio/src/components/Timeline.tsx`: Rewrite to support visual track, region highlighting, and draggable markers.
  - `packages/studio/src/components/RendersPanel/RendersPanel.tsx`: Pass range to `startRender`.
- **Read-Only**:
  - `packages/studio/src/App.tsx`
  - `packages/studio/src/components/Layout/StudioLayout.tsx`

#### 3. Implementation Spec
- **Architecture**:
  - **State**: Extend `PlayerState` interface in `StudioContext` to include `inPoint` (number, default 0) and `outPoint` (number, default totalFrames).
  - **Component**: Custom `div`-based timeline with absolute positioning for markers/playhead based on percentages.
  - **Interaction**: Mouse event listeners on container for scrubbing and drag-and-drop for markers.
- **Pseudo-Code (StudioContext.tsx)**:
  ```typescript
  interface PlayerState {
    // ... existing
    inPoint: number;
    outPoint: number;
  }

  // In Provider
  // Initialize inPoint=0, outPoint=duration*fps
  // setInPoint/setOutPoint setters
  // startRender(id, options: { inPoint, outPoint }) => void
  ```
- **Pseudo-Code (Timeline.tsx)**:
  ```typescript
  // On Mount / Update
  // Calculate totalFrames from duration * fps

  // Render Structure
  // <div className="timeline-container">
  //   <div className="timeline-ruler">...ticks...</div>
  //   <div className="timeline-track" onMouseDown={handleScrub}>
  //     <div className="timeline-region" style={{ left: in%, width: (out-in)% }} />
  //     <div className="timeline-marker in" style={{ left: in% }} onMouseDown={dragIn} />
  //     <div className="timeline-marker out" style={{ left: out% }} onMouseDown={dragOut} />
  //     <div className="timeline-playhead" style={{ left: current% }} />
  //   </div>
  // </div>

  // Logic
  // clamp(value, 0, totalFrames)
  // dragIn: updates inPoint (clamped to < outPoint)
  // dragOut: updates outPoint (clamped to > inPoint)
  // KeyDown 'i' => setInPoint(currentFrame)
  // KeyDown 'o' => setOutPoint(currentFrame)
  ```
- **Public API Changes**:
  - `StudioContext`: `startRender` accepts `options` object with `inPoint` and `outPoint`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run dev` in `packages/studio`.
  - Open `http://localhost:5173`.
  - Verify timeline ruler and playhead exist.
  - Verify "In" and "Out" markers appear at start/end.
  - Drag markers and verify they move and update the highlighted region.
  - Press 'I' and 'O' at different frames and verify markers jump to playhead.
  - Click "Start Test Render" in Renders Panel and check console (or UI if updated) for range data.
- **Success Criteria**:
  - Markers are draggable.
  - Render job created with correct range.
  - 'I'/'O' shortcuts work.
- **Edge Cases**:
  - Dragging In past Out (should clamp or swap).
  - Dragging past bounds (0 or total frames).
  - Resizing window (timeline should adapt if responsive).
