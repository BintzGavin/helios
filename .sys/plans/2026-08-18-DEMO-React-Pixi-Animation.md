# Plan: Create React Pixi.js Example

#### 1. Context & Goal
- **Objective**: Create `examples/react-pixi-animation` to demonstrate how to use Pixi.js with React in Helios.
- **Trigger**: Vision Gap - The "Canvas MVP" (WebCodecs) path explicitly supports Pixi.js, but we currently only have a Vanilla JS example. React is a primary framework and needs a dedicated Pixi.js example to ensure parity.
- **Impact**: Unlocks high-performance 2D animation for React users, fulfilling the "Any Framework" and "Canvas MVP" promises.

#### 2. File Inventory
- **Create**:
    - `examples/react-pixi-animation/vite.config.js`: Vite configuration for React.
    - `examples/react-pixi-animation/composition.html`: Entry point for Helios Renderer.
    - `examples/react-pixi-animation/index.html`: Entry point for local dev preview.
    - `examples/react-pixi-animation/src/main.jsx`: React application entry.
    - `examples/react-pixi-animation/src/App.jsx`: Main React component integrating Pixi.js.
    - `examples/react-pixi-animation/src/hooks/useVideoFrame.js`: Helper hook for Helios frame data.
- **Modify**:
    - `tests/e2e/verify-render.ts`: Add `react-pixi-animation` to `CANVAS_OVERRIDES` to ensure it renders in 'canvas' mode during E2E tests.
- **Read-Only**:
    - `vite.build-example.config.js`: Verifying that no changes are needed.

#### 3. Implementation Spec
- **Architecture**:
    - **Integration Pattern**: Direct Integration (Native). We will use `pixi.js` directly within a `useEffect` hook rather than `@pixi/react`. This avoids potential version conflicts (Pixi v8 vs v7 wrappers) and aligns with the "Use What You Know" philosophy.
    - **State Management**: `useVideoFrame` hook will subscribe to Helios and trigger re-renders or side-effects.
    - **Animation Loop**:
        - Initialize `pixi.js` `Application` in `useEffect`.
        - Subscribe to `helios` to update Pixi display objects directly (bypassing React render cycle for performance).
- **Pseudo-Code**:
  (Description of App.jsx logic)
  - Create a ref for the container.
  - In `useEffect`:
    - Instantiate `new Application()`.
    - Call `app.init()` with resize options.
    - Append `app.canvas` to container.
    - Create a Pixi Graphics object (e.g., a rotating shape).
    - Add it to `app.stage`.
    - Subscribe to `helios.subscribe` to update the Graphics rotation based on `state.currentTime`.
    - Cleanup: `app.destroy()` on unmount.
- **Dependencies**:
    - `pixi.js` (Existing)
    - `react` (Existing)

#### 4. Test Plan
- **Verification**: `npm run build:examples && npx tsx tests/e2e/verify-render.ts` (specifically checking `react-pixi-animation`).
- **Success Criteria**:
    - Build completes without errors.
    - `verify-render.ts` successfully renders the composition.
    - Output video has non-black frames (verified by `verifyVideoContent`).
- **Edge Cases**:
    - Async initialization of Pixi v8 application ensuring Helios is bound correctly.
