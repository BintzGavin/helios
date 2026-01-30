# Spec: Markers Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/markers-animation` to demonstrate the Timeline Markers feature in `packages/core`.
- **Trigger**: The `markers` feature exists in `packages/core` (via `markers.ts` and `Helios` config) but has no corresponding example in `examples/`, making it a "hidden" feature.
- **Impact**:
    - Validates the `markers` API (validation, sorting, state exposure).
    - Provides a reference implementation for users and the future Studio UI.
    - Ensures `markers` are covered by E2E regression testing.

## 2. File Inventory
- **Create**:
    - `examples/markers-animation/composition.html`: The main example logic using vanilla JS and Canvas.
    - `examples/markers-animation/vite.config.js`: Minimal Vite config.
    - `examples/markers-animation/package.json`: Minimal package definition.
- **Modify**:
    - `vite.build-example.config.js`: Add the new example to the build inputs.
    - `tests/e2e/verify-render.ts`: Add the new example to the verification list.
- **Read-Only**:
    - `packages/core/src/markers.ts`: To reference the `Marker` interface.

## 3. Implementation Spec
- **Architecture**: Vanilla JS with `Helios` Core.
- **Pseudo-Code**:
   ```javascript
   // composition.html
   import { Helios } from '@helios-project/core';

   const markers = [
     { id: 'start', time: 0, label: 'Intro', color: '#ff0000' },
     { id: 'mid', time: 2, label: 'Middle', color: '#00ff00' },
     { id: 'end', time: 4, label: 'End', color: '#0000ff' }
   ];

   const helios = new Helios({ duration: 5, markers });

   helios.subscribe(state => {
      // Draw timeline on canvas
      // Draw markers as vertical lines
      // Draw current frame indicator

      // Determine active section color
      const activeMarker = state.markers.slice().reverse().find(m => m.time * state.fps <= state.currentFrame);
      fillBackground(activeMarker ? activeMarker.color : '#000');
   });

   // HTML UI
   // Buttons: <button onclick="helios.seekToMarker('mid')">Go to Middle</button>
   ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - `npm run build:examples`: Ensure `examples/markers-animation` compiles.
    - `npx tsx tests/e2e/verify-render.ts`: Ensure `Markers Animation` passes.
- **Success Criteria**:
    - Build artifact exists.
    - Video output is generated and verified.
- **Edge Cases**:
    - None (Happy path demonstration).
