# 2026-09-14-DEMO-Standardize-React-Three-Fiber.md

#### 1. Context & Goal
- **Objective**: Modernize the `examples/react-three-fiber` example by converting it to TypeScript, adding a self-contained `package.json`, and standardizing the build configuration.
- **Trigger**: The current example uses legacy patterns (no `package.json`, relative imports, JSX) which contradicts the "Professional" and "Use What You Know" vision.
- **Impact**: Provides a robust, copy-pasteable reference for the most popular 3D library in the React ecosystem, ensuring users start with best practices.

#### 2. File Inventory
- **Create**:
    - `examples/react-three-fiber/package.json`: Defines dependencies and scripts.
    - `examples/react-three-fiber/tsconfig.json`: TypeScript configuration.
    - `examples/react-three-fiber/src/main.tsx`: Typed entry point.
- **Modify**:
    - `examples/react-three-fiber/src/App.jsx` -> `examples/react-three-fiber/src/App.tsx`: Convert to TS and use `@helios-project/core` alias.
    - `examples/react-three-fiber/src/Scene.jsx` -> `examples/react-three-fiber/src/Scene.tsx`: Convert to TS.
    - `examples/react-three-fiber/vite.config.js` -> `examples/react-three-fiber/vite.config.ts`: Update aliases and plugins.
    - `examples/react-three-fiber/composition.html`: Update entry point to `src/main.tsx`.
- **Delete**:
    - `examples/react-three-fiber/src/main.jsx` (Replaced by main.tsx)

#### 3. Implementation Spec
- **Architecture**:
    - **Standalone Project**: The example will have its own `package.json` so users can eject it easily.
    - **TypeScript**: Full type safety for Helios and Three.js interactions.
    - **Vite Alias**: Map `@helios-project/core` to the local workspace path for dev, mirroring how a user would import the package.
- **Dependencies**:
    - `react`, `react-dom` (^19.2.3)
    - `three` (^0.182.0)
    - `@react-three/fiber` (^9.5.0)
    - `@react-three/drei` (^10.7.7)
    - DevDeps: `vite`, `typescript`, `@types/react`, `@types/react-dom`, `@types/three`
- **Pseudo-Code (App.tsx)**:
    ```typescript
    import { Helios } from '@helios-project/core'; // Standard import
    // ... imports

    // Instantiate Helios
    const helios = new Helios({ ... });

    export default function App() {
       // ... Logic to drive R3F manually via helios.subscribe
       // r3fState.advance(currentFrame / fps);
    }
    ```

#### 4. Test Plan
- **Verification**:
    - Run `npm run build:examples` from the root to ensure it compiles with the global build.
    - Run `npm run dev:react` (which targets `examples/react-canvas-animation`, but I can manually run `npx vite examples/react-three-fiber` or similar to verify dev mode if needed, though the build is the primary check).
- **Success Criteria**:
    - Build succeeds.
    - Output directory `output/example-build/examples/react-three-fiber` contains `composition.html` and assets.
- **Edge Cases**:
    - Verify `useFrame` logic in `Scene.tsx` compiles correctly with types.
