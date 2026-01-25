# Spec: Scaffold Pixi.js Example

#### 1. Context & Goal
- **Objective**: Create a canonical example demonstrating Helios integration with Pixi.js for high-performance 2D WebGL rendering.
- **Trigger**: The `README.md` explicitly lists Pixi.js as a supported use case ("Choose Helios If... You need canvas/WebGL performance (Three.js, Pixi.js)"), but no example currently exists in `examples/`.
- **Impact**: Validates the "Use What You Know" promise for the Pixi.js community and provides a reference implementation for high-performance 2D animations.

#### 2. File Inventory
- **Create**:
  - `examples/pixi-canvas-animation/composition.html`: Entry point for the Pixi example.
  - `examples/pixi-canvas-animation/src/main.ts`: Main logic combining Helios and Pixi.js.
- **Modify**:
  - `package.json`: Add `pixi.js` dependency and `dev:pixi` script.
  - `vite.build-example.config.js`: Add `pixi_composition` to build inputs.
  - `tests/e2e/verify-render.ts`: Add Pixi test case to the verification suite.
- **Read-Only**:
  - `examples/simple-canvas-animation/src/main.ts`: Reference for Helios setup.

#### 3. Implementation Spec

**Architecture:**
- Uses `pixi.js` (v8+) `Application` to manage the WebGL canvas.
- `Helios` instance drives the animation.
- `helios.subscribe` or `onFrame` callback updates Pixi display objects based on `currentFrame`.
- **Critical:** Must ensure Pixi's internal ticker is synchronized or driven by Helios, OR simply update properties on every Helios frame and let Pixi render naturally (since Helios is the source of truth for time).
- For `canvas` mode, Pixi's canvas element must be accessible to the Helios exporter.

**Pseudo-Code (`examples/pixi-canvas-animation/src/main.ts`):**
```typescript
import { Helios } from '@helios-engine/core';
import { Application, Graphics } from 'pixi.js';

// 1. Init Helios
const helios = new Helios({
  fps: 30,
  duration: 10,
  // ...
});

// 2. Init Pixi
const app = new Application();
await app.init({ width: 1920, height: 1080, backgroundAlpha: 0 });
document.getElementById('app').appendChild(app.canvas);

// 3. Create Scene
const rect = new Graphics()
  .rect(0, 0, 100, 100)
  .fill(0xFF0000);
rect.pivot.set(50, 50);
rect.position.set(1920/2, 1080/2);
app.stage.addChild(rect);

// 4. Sync
helios.onFrame(({ currentFrame, fps }) => {
  const time = currentFrame / fps;
  rect.rotation = time * Math.PI; // Rotate over time

  // Force render if needed, or rely on Pixi's loop if it matches
  // Ideally, we just update state here.
});

// 5. Start
helios.play();
```

**Changes to `package.json`:**
- Add `"pixi.js": "^8.0.0"` to `devDependencies`.
- Add `"dev:pixi": "vite serve examples/pixi-canvas-animation"` to `scripts`.

**Changes to `vite.build-example.config.js`:**
- Add `pixi_composition` entry pointing to `examples/pixi-canvas-animation/composition.html`.

**Changes to `tests/e2e/verify-render.ts`:**
- Add `{ name: 'Pixi', relativePath: 'examples/pixi-canvas-animation/composition.html', mode: 'canvas' }` to the `CASES` array.

#### 4. Test Plan
- **Verification**:
  1. `npm install` (to install pixi.js)
  2. `npm run build:examples` (to ensure it builds)
  3. `npx ts-node tests/e2e/verify-render.ts` (to ensure it renders correctly)
- **Success Criteria**:
  - Build completes without error.
  - Verification script prints `✅ Pixi Passed!`.
  - Output video contains a rotating red rectangle.
- **Edge Cases**:
  - Ensure Pixi canvas is properly detected by Helios (it should be if appended to DOM).
