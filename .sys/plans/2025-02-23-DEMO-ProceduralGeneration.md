# Scaffold Procedural Generation Example

#### 1. Context & Goal
- **Objective**: Create `examples/procedural-generation` to demonstrate the `random` and `interpolateColors` utilities from `@helios-engine/core`.
- **Trigger**: "Vision Gap" - The README and codebase contain powerful core utilities (`random` for deterministic seeding, `interpolateColors`) that are currently undemonstrated in any example.
- **Impact**: Users will have a reference for creating deterministic generative art and procedural animations, ensuring stability across renders.

#### 2. File Inventory
- **Create**:
  - `examples/procedural-generation/composition.html`: Entry point for the example.
  - `examples/procedural-generation/src/main.ts`: Logic implementing the procedural grid using Core utilities.
  - `examples/procedural-generation/vite.config.js`: Local Vite configuration.
- **Modify**:
  - `vite.build-example.config.js`: Add new entry point for the build system.
  - `tests/e2e/verify-render.ts`: Add verification case for this example.
  - `package.json`: Add `dev:procedural` script to run the example.
- **Read-Only**:
  - `packages/core/src/random.ts`
  - `packages/core/src/color.ts`

#### 3. Implementation Spec
- **Architecture**: Vanilla JS + Canvas (minimal dependencies) to keep focus on Core utilities.
- **Pseudo-Code (`main.ts`)**:
  ```typescript
  import { Helios, random, interpolateColors } from '@helios-engine/core';

  // Init Helios
  const helios = new Helios({ fps: 30, duration: 10 });
  helios.bindToDocumentTimeline();

  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  // Grid Config
  const COLS = 10;
  const ROWS = 10;

  // Resize handler
  function resize() { ... }
  window.addEventListener('resize', resize);
  resize();

  helios.subscribe((state) => {
    const frame = state.currentFrame;
    const { width, height } = canvas;

    // Background Color Cycle
    // Use interpolateColors to shift background over time
    const bg = interpolateColors(frame, [0, 300], ['#1a1a2e', '#16213e'], { extrapolateRight: 'clamp' });
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const cellW = width / COLS;
    const cellH = height / ROWS;

    // Draw Grid
    for (let i = 0; i < COLS * ROWS; i++) {
       const col = i % COLS;
       const row = Math.floor(i / COLS);

       // Deterministic properties based on index
       // random(i) returns same value every render for this cell
       const seed = i;
       const baseSize = random(seed) * (Math.min(cellW, cellH) * 0.5);
       const speed = random(seed + 1000) * 0.2;
       const offset = random(seed + 2000) * Math.PI * 2;
       const colorSeed = random(seed + 3000);

       // Animate scale using sine wave based on frame
       const currentScale = 0.5 + 0.5 * Math.sin(frame * speed + offset);

       const x = col * cellW + cellW/2;
       const y = row * cellH + cellH/2;

       // Color based on position or random
       ctx.fillStyle = colorSeed > 0.5 ? 'tomato' : 'teal';

       // Draw
       ctx.beginPath();
       ctx.arc(x, y, baseSize * currentScale, 0, Math.PI * 2);
       ctx.fill();
    }
  });
  ```
- **Configuration**:
  - `vite.build-example.config.js`: Add `procedural_generation: resolve(__dirname, "examples/procedural-generation/composition.html")` to inputs.
  - `package.json`: Add `"dev:procedural": "vite serve examples/procedural-generation"`

#### 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure it builds.
  2. Run `ts-node tests/e2e/verify-render.ts` (which will include the new case) to verify it renders.
- **Success Criteria**:
  - Build succeeds.
  - Render produces `output/procedural-generation-render-verified.mp4`.
  - Video shows deterministic animation (grid of pulsing circles).
