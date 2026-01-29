# Spec: Safe Area Guides

## 1. Context & Goal
- **Objective**: Implement toggleable Safe Area Guides (Action Safe, Title Safe, Crosshair) in the Studio Stage.
- **Trigger**: Vision gap "Canvas Controls". Standard video tools provide guides for layout safety, which Helios Studio currently lacks.
- **Impact**: Enhances the "Studio" experience by providing visual aids for professional video composition layout.

## 2. File Inventory
- **Modify**:
  - `packages/studio/src/components/Stage/Stage.tsx`: Add state, overlay rendering, and shortcut logic.
  - `packages/studio/src/components/Stage/StageToolbar.tsx`: Add "Guides" toggle button.
  - `packages/studio/src/components/Stage/Stage.css`: Add styles for guide overlays.
- **Read-Only**:
  - `packages/studio/src/hooks/useKeyboardShortcut.ts`: For reference on implementing the shortcut.

## 3. Implementation Spec
- **Architecture**:
  - **State**: Add `showGuides` (boolean) state to `Stage.tsx`.
  - **Shortcut**: Bind `'` (Quote) key to toggle `showGuides` using `useKeyboardShortcut` inside `Stage`.
  - **Rendering**:
    - Create a `.stage-guides-overlay` container inside `.stage-content` (sibling to `<helios-player>`).
    - It must match the `width` and `height` of the player (using `canvasSize`).
    - It must be positioned absolutely over the player with `pointer-events: none`.
  - **Components**:
    - **Action Safe**: 90% width/height box (5% margins), cyan/green dashed border.
    - **Title Safe**: 80% width/height box (10% margins), yellow/red dashed border.
    - **Crosshair**: Center horizontal and vertical lines (50%), white/gray dashed.
  - **Toolbar**:
    - Add a button to `StageToolbar` with a "Grid/Ruler" icon (e.g., `#` or `⊞`).
    - Toggle `showGuides` state on click.
    - Button should appear "active" (different background) when guides are enabled.

- **Pseudo-Code (Stage.tsx)**:
  ```typescript
  const [showGuides, setShowGuides] = useState(false);

  useKeyboardShortcut("'", () => setShowGuides(p => !p), { ignoreInput: true });

  // In render:
  <div className="stage-content" ...>
    <helios-player ... />
    {showGuides && (
       <div className="stage-guides" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <div className="guide-action-safe" />
          <div className="guide-title-safe" />
          <div className="guide-crosshair-x" />
          <div className="guide-crosshair-y" />
       </div>
    )}
  </div>
  ```

## 4. Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Open any composition.
  3. Click the "Guides" button in the toolbar -> Verify overlay appears.
  4. Press `'` (Quote) key -> Verify overlay toggles.
  5. Zoom and Pan the stage -> Verify guides move/scale WITH the canvas (not screen).
  6. Resize canvas (e.g. to 1080x1920) -> Verify guides adjust to new aspect ratio.
- **Success Criteria**:
  - Guides are visible but unobtrusive (correct opacity).
  - Guides align correctly (center, 90%, 80%).
  - UI feedback in toolbar is clear.
