# Context & Goal
- **Objective**: Implement a dedicated `Stage` component with Zoom, Pan, and Transparency toggle controls for the composition preview.
- **Trigger**: Vision gap "Canvas Controls - Zoom, resize, and toggle transparent backgrounds" in README.
- **Impact**: Enables pixel-perfect inspection of compositions and testing against different backgrounds (transparency check), significantly improving the WYSIWYG experience.

# File Inventory
- **Create**:
    - `packages/studio/src/components/Stage/Stage.tsx`: Main container logic for the preview area.
    - `packages/studio/src/components/Stage/StageToolbar.tsx`: Floating controls for Zoom/Background.
    - `packages/studio/src/components/Stage/Stage.css`: Styles for the stage, checkerboard background, and transformations.
- **Modify**:
    - `packages/studio/src/App.tsx`: Replace inline stage rendering with `<Stage />` and remove direct controller initialization logic (delegated to Stage).
- **Read-Only**:
    - `packages/studio/src/context/StudioContext.tsx`: To ensure `setController` is available.

# Implementation Spec
- **Architecture**:
    - **Delegated Control**: Move `<helios-player>` instantiation and controller connection logic from `App.tsx` to `Stage.tsx`. `Stage` becomes the owner of the player lifecycle.
    - **Local UI State**: `Stage.tsx` manages `zoom` (number, default 1), `pan` ({x, y}, default {0,0}), and `transparent` (boolean, default true).
    - **CSS Transforms**: Use `transform: translate(...) scale(...)` on a wrapper div around `<helios-player>` to implement zoom/pan.
    - **Transparency**: Use a CSS class toggling a "checkerboard" background pattern on the container behind the player.
- **Stage Component (`Stage.tsx`)**:
    - **Props**: `src` (string) - The composition URL.
    - **Logic**:
        - `useEffect`: Polls `element.getController()` and calls `setController` from context.
        - `onWheel`: Updates `zoom` (if Ctrl/Cmd pressed) or `pan` (if not).
        - `onMouseDown`: Initiates drag-to-pan logic.
- **StageToolbar Component (`StageToolbar.tsx`)**:
    - **UI**: A floating or fixed bar (bottom-right of Stage).
    - **Controls**:
        - "Fit" button (Resets zoom/pan).
        - Zoom buttons ("-", "+", Display %).
        - Transparency Toggle (Checkerboard icon).

# Test Plan
- **Verification**:
    1. Run `npx helios studio`.
    2. Load a composition (e.g., `simple_dom` or default).
    3. Verify `<helios-player>` renders within the new Stage area.
    4. **Zoom**: Test "Zoom In/Out" buttons and `Ctrl+Scroll`. Verify the player scales.
    5. **Pan**: Test "Drag" to pan. Verify the player moves.
    6. **Transparency**: Toggle the checkerboard button. Verify the background changes between dark/solid and checkerboard.
    7. **Controller**: Verify Play/Pause still works (confirms `setController` integration).
- **Success Criteria**:
    - Composition is viewable, zoomable, and pannable.
    - Transparency toggle visually impacts the background.
    - No regression in playback control.
- **Edge Cases**:
    - Composition URL change: Ensure zoom/pan resets (or persists if preferred—let's reset for now) and controller reconnects.
    - Max Zoom (500%) / Min Zoom (10%).
