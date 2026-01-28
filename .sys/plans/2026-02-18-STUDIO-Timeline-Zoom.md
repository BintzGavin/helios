# 📋 STUDIO: Timeline Zoom & Scroll

## 1. Context & Goal
- **Objective**: Implement a zoomable and scrollable timeline to improve editing precision for long compositions.
- **Trigger**: Vision gap - "Timeline Scrubber" is present but unusable for frame-perfect editing on long videos due to lack of zoom.
- **Impact**: Enables precise navigation, in/out point setting, and caption review, significantly improving the "Pro" feel of the Studio.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` - Add zoom state, slider, and logic to switch between "Fit" and "Pixel-based" width.
- **Modify**: `packages/studio/src/components/Timeline.css` - Update layout to support horizontal scrolling (`overflow-x: auto`) and absolute positioning of content.

## 3. Implementation Spec
- **Architecture**:
  - Introduce `zoom` state (0-100 range) in `Timeline` component.
  - **Logic**:
    - If `zoom === 0`: "Fit Mode". Track width is `100%`. Event calculations use `rect.width`.
    - If `zoom > 0`: "Scroll Mode". Track width is calculated as `totalFrames * pixelsPerFrame`.
      - `pixelsPerFrame` scales with zoom slider (e.g., from 0.1px to 20px per frame).
  - **DOM Structure**:
    - Wrapper `div.timeline-track-area` becomes the scroll container (`overflow-x: auto`).
    - Inner `div.timeline-content` holds the track, markers, and playhead. Its width is explicitly set.
- **Pseudo-Code**:
  ```tsx
  const [zoom, setZoom] = useState(0); // 0 = fit
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); // Replaces trackRef for sizing

  // Calculate pixels per frame based on zoom
  // Logarithmic scale often feels better, but linear is fine for V1
  const pixelsPerFrame = zoom === 0
    ? 0 // distinct from calculated
    : 0.1 * Math.pow(1.05, zoom); // Exponential zoom or simple multiplier

  // If zoom > 0, width = totalFrames * pixelsPerFrame
  // If zoom == 0, width = '100%'

  // Update getFrameFromEvent to use contentRef's bounding rect
  // Since click is on contentRef, e.clientX relative to contentRef.left is correct regardless of scroll
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Load a composition (ideally > 10 seconds).
  3. Drag the new zoom slider in the Timeline header.
  4. Verify horizontal scrollbar appears on the track area.
  5. Scroll to the middle.
  6. Click to seek; verify playhead jumps to the correct visual position.
  7. Move markers (In/Out); verify they track correctly with the mouse.
  8. Reset slider to 0; verify it snaps back to "Fit" view.
- **Success Criteria**: Timeline expands horizontally when zoomed; seeking and marker dragging remain accurate in both Fit and Zoom modes.
- **Edge Cases**:
  - "Fit" mode on window resize (should stay 100%).
  - Zero duration composition (avoid division by zero).
