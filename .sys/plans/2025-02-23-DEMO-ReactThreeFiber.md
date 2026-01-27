# 2025-02-23-DEMO-ReactThreeFiber

## 1. Context & Goal
- **Objective**: Scaffold a new `examples/react-three-fiber` directory to demonstrate integration between Helios and the React Three Fiber (R3F) ecosystem.
- **Trigger**: The "Use What You Know" vision promises compatibility with standard React tools, and R3F is the de-facto standard for 3D in React. Currently, no R3F example exists.
- **Impact**: Unlocks the 3D React ecosystem for Helios users, proving that Helios can drive R3F's `frameloop` manually for frame-perfect rendering.

## 2. File Inventory
- **Create**:
  - `examples/react-three-fiber/composition.html` (Entry point)
  - `examples/react-three-fiber/vite.config.js` (Example-specific config)
  - `examples/react-three-fiber/src/main.jsx` (React mount point)
  - `examples/react-three-fiber/src/App.jsx` (Main component with integration logic)
  - `examples/react-three-fiber/src/Scene.jsx` (3D scene content)
- **Modify**:
  - `package.json` (Add `@react-three/fiber` and `@react-three/drei` to `devDependencies`)
  - `vite.build-example.config.js` (Add `react_three_fiber` entry to build config)
  - `tests/e2e/verify-render.ts` (Add `React Three Fiber` verification case)
- **Read-Only**:
  - `packages/core/dist/index.js` (Core API)

## 3. Implementation Spec
- **Architecture**:
  - **Dependency Management**: Add `@react-three/fiber` and `@react-three/drei` to the *root* `package.json` so they are available to the example (which is not a workspace but shares the root `node_modules`).
  - **Rendering Strategy**: Use R3F's `<Canvas frameloop="never">` to disable the internal RequestAnimationFrame loop.
  - **Time Control**: Capture the R3F state via `onCreated` or `useThree` and manually call `state.advance(timestamp)` inside `helios.subscribe()`.

- **Pseudo-Code (App.jsx)**:
  ```javascript
  import { Canvas } from '@react-three/fiber';
  import { Helios } from '../../../packages/core/dist/index.js';
  import { Scene } from './Scene';
  import { useState, useEffect } from 'react';

  // Singleton Helios instance
  const helios = new Helios({ fps: 30, duration: 10, autoSyncAnimations: true });
  helios.bindToDocumentTimeline();
  window.helios = helios;

  export default function App() {
    const [r3fState, setR3fState] = useState(null);

    useEffect(() => {
      if (!r3fState) return;

      // Drive R3F loop manually
      return helios.subscribe((state) => {
        // R3F advance() typically expects seconds (if using default Clock)
        // We sync R3F's internal clock to Helios time
        const timeInSeconds = state.currentFrame / state.fps;
        r3fState.advance(timeInSeconds);
      });
    }, [r3fState]);

    return (
      <Canvas
        frameloop="never"
        onCreated={(state) => setR3fState(state)}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene />
      </Canvas>
    );
  }
  ```

- **Pseudo-Code (vite.build-example.config.js)**:
  - Add entry: `react_three_fiber: resolve(__dirname, "examples/react-three-fiber/composition.html"),`

## 4. Test Plan
- **Verification**:
  1. Install new dependencies: `npm install`
  2. Build examples: `npm run build:examples`
  3. Verify render: `ts-node tests/e2e/verify-render.ts`
- **Success Criteria**:
  - `npm install` succeeds without peer dependency errors.
  - The build artifact `output/example-build/examples/react-three-fiber/composition.html` exists.
  - The verification script outputs `✅ React Three Fiber Passed!`.
  - The generated video (`output/react-three-fiber-render-verified.mp4`) shows a 3D scene animating smoothly.
- **Edge Cases**:
  - **Time Units**: R3F `advance` might behave differently depending on version. Verify if it accumulates deltas or sets absolute time. (Usually `advance(timestamp)` sets `clock.elapsedTime = timestamp` if `frameloop="never"`).
  - **Resize**: Ensure `Canvas` handles resize correctly (R3F handles this natively usually).
