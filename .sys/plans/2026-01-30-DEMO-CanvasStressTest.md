# Plan: Canvas Stress Test Example

## 1. Context & Goal
- **Objective**: Create a high-performance Canvas stress test example rendering 10,000 particles to validate Helios's performance claims.
- **Trigger**: Vision gap "Performance When It Matters" - existing examples are low-intensity or DOM-based; we need a "heavy" Canvas benchmark.
- **Impact**: Demonstrates Helios's capability to drive complex Canvas visualizations and provides a performance benchmark against the DOM-based stress test.

## 2. File Inventory
- **Create**:
  - `examples/stress-test-canvas/composition.html`: The composition file containing the particle system logic.
- **Modify**:
  - `vite.build-example.config.js`: Add `stress_test_canvas` entry to the build configuration.
  - `tests/e2e/verify-render.ts`: Add `{ name: 'Stress Test Canvas', ... }` to the `CASES` array.
- **Read-Only**:
  - `examples/stress-test-animation/composition.html`: For reference on the DOM stress test structure.

## 3. Implementation Spec
- **Architecture**:
  - Vanilla JavaScript with HTML5 Canvas API.
  - No external rendering libraries (Three.js/Pixi) to isolate Helios performance.
- **Pseudo-Code**:
  - Initialize `Helios` with `fps: 30`, `duration: 5`, `width: 1920`, `height: 1080`.
  - Initialize `Canvas` context.
  - Generate 10,000 particles (simple objects with `x`, `y`, `vx`, `vy`, `color`).
  - Implement `draw(frame)` function:
    - Calculate time `t` from frame.
    - Clear canvas.
    - Loop through particles:
      - Update position: `x = initialX + vx * t`. (Deterministic physics)
      - Wrap around screen edges.
      - Draw `fillRect` (faster than `arc`).
  - `helios.subscribe(draw)`.
- **Dependencies**: `@helios-project/core`.

## 4. Test Plan
- **Verification**: `npm run build:examples && npx tsx tests/e2e/verify-render.ts`
- **Success Criteria**:
  - Build completes successfully.
  - `Stress Test Canvas` passes verification.
  - Output video `output/stress-test-canvas-render-verified.mp4` is generated and contains moving particles.
- **Edge Cases**:
  - Ensure deterministic rendering (avoid `Math.random()` inside the render loop; pre-calculate or seed).
