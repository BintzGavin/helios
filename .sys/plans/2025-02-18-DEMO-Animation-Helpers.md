# Spec: Scaffolding Animation Helpers Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/animation-helpers` that demonstrates the use of `interpolate` and `spring` functions from `@helios-project/core`.
- **Trigger**: The README promises "Animation Helpers" for Remotion-style workflows (code-driven animation), but no existing example demonstrates them. This is a documented vision gap.
- **Impact**:
  - Validates that the exported helpers (`interpolate`, `spring`) work correctly in a browser environment.
  - Provides a reference implementation for users migrating from Remotion or preferring code-first animation.

## 2. File Inventory
- **Create**:
  - `examples/animation-helpers/composition.html`: The entry point for the composition.
  - `examples/animation-helpers/vite.config.js`: Configuration for the dev server (standard boilerplate).
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build input configuration (key: `animation_helpers`).
  - `tests/e2e/verify-render.ts`: Add a new test case to verify the example builds and renders.
- **Read-Only**:
  - `packages/core/dist/index.js`: The compiled core library to import from.

## 3. Implementation Spec
- **Architecture**:
  - Vanilla JS + Canvas (similar to `simple-canvas-animation`).
  - Imports `Helios`, `interpolate`, `spring` from `../../packages/core/dist/index.js`.
- **Pseudo-Code (composition.html)**:
  ```html
  <html>
    <canvas id="canvas"></canvas>
    <script type="module">
      import { Helios, interpolate, spring } from '../../packages/core/dist/index.js';

      const helios = new Helios({ duration: 5, fps: 30 });
      helios.bindToDocumentTimeline();

      function draw(frame) {
        // Clear canvas

        // Interpolate X position: 0 -> 500 over frames 0 -> 60
        const x = interpolate(frame, [0, 60], [0, 500], { extrapolateRight: 'clamp' });

        // Spring scale: pop in from 0 to 1 starting at frame 0
        const scale = spring({ frame, fps: 30, from: 0, to: 1, config: { stiffness: 120, damping: 10 } });

        // Draw Rectangle at X
        // Draw Circle with Scale
      }

      helios.subscribe(state => draw(state.currentFrame));

      // Handle resize, expose window.helios
    </script>
  </html>
  ```
- **Dependencies**:
  - Requires `packages/core` to be built.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the new example compiles.
  2. Run `npx tsx tests/e2e/verify-render.ts` to verify the rendering pipeline works for the new example.
- **Success Criteria**:
  - Build succeeds without error.
  - `verify-render.ts` reports "✅ Helpers Passed!".
  - Output video `output/helpers-render-verified.mp4` is generated.
