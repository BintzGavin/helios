# Context & Goal
- **Objective**: Implement user controls for setting the composition's output resolution (width/height) in the Studio interface.
- **Trigger**: Vision Gap ("Canvas Controls - ... resize...") and hardcoded `1920x1080` in rendering logic.
- **Impact**: Enables users to create and render videos in different aspect ratios (e.g., Vertical 9:16, 4K, Square) and resolutions.

# File Inventory
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`: Add `canvasSize` state and updater.
  - `packages/studio/src/components/Stage/Stage.tsx`: Update player container to respect `canvasSize` dimensions.
  - `packages/studio/src/components/Stage/StageToolbar.tsx`: Add resolution selector and custom input fields.
- **Read-Only**:
  - `packages/studio/src/components/Stage/Stage.css`

# Implementation Spec
- **Architecture**:
  - State Management: `StudioContext` will hold a `canvasSize` object `{ width: number, height: number }`.
  - Component Logic: `Stage` component will render the `<helios-player>` inside a container explicitly sized to `canvasSize`, centered and transformed by the zoom/pan logic.
  - UI: `StageToolbar` will include a dropdown for common presets (1920x1080, 1080x1920, 1080x1080, 4K) and manual number inputs.
- **Public API Changes**:
  - `StudioContextType` extended with `canvasSize: { width: number; height: number }` and `setCanvasSize`.
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Start Studio via `npm run dev`.
  2. Locate resolution controls in the Stage Toolbar (bottom right).
  3. Select "Vertical (1080x1920)" preset.
  4. Verify the player preview updates to a vertical aspect ratio.
  5. Manually enter "500" x "500".
  6. Verify the player preview updates to a square.
  7. Trigger a render (if functional) or inspect `startRender` call to ensure correct dimensions are passed.
- **Success Criteria**:
  - Player preview accurately reflects the selected dimensions.
  - `/api/render` payload receives the user-defined width/height.
- **Edge Cases**:
  - Invalid inputs (negative, text) should be handled or prevented.
  - Very large resolutions shouldn't break the UI layout (zoom should still work).
