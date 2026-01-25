# 1. Context & Goal
- **Objective**: Scaffold a new example `examples/react-dom-animation` to demonstrate how to use Helios with React to drive standard DOM/CSS animations.
- **Trigger**: The Vision ("Use What You Know", React support) vs. Reality (Only React Canvas example exists).
- **Impact**: Provides a reference for users wanting to use React components for video, not just Canvas. This is a critical part of the "Use What You Know" promise.

# 2. File Inventory
- **Create**:
  - `examples/react-dom-animation/vite.config.js`: Vite config for the example (copy standard pattern).
  - `examples/react-dom-animation/composition.html`: HTML entry point.
  - `examples/react-dom-animation/src/main.jsx`: React entry point (mounting to `#root`).
  - `examples/react-dom-animation/src/App.jsx`: Main component demonstrating DOM animation driven by Helios.
  - `examples/react-dom-animation/src/hooks/useVideoFrame.js`: Hook to consume Helios state (local implementation).
- **Modify**:
  - `vite.build-example.config.js`: Register the new example input key `react_dom`.
  - `package.json`: Add `dev:react-dom` script.
  - `tests/e2e/verify-render.ts`: Add verification case for `React DOM` (mode: 'dom').
- **Read-Only**:
  - `examples/react-canvas-animation/vite.config.js` (for reference)

# 3. Implementation Spec
- **Architecture**:
  - **Vite + React**: Standard setup.
  - **Helios Integration**: `Helios` instance created in global scope (or module scope), bound to document timeline via `helios.bindToDocumentTimeline()`.
  - **Reactivity**: `useVideoFrame` hook subscribes to `helios` and returns `currentFrame`.
  - **Animation**: `App.jsx` uses `currentFrame` to calculate styles (e.g., `opacity`, `transform`) and applies them to standard `<div>` elements.
  - **Exports**: `window.helios` must be exposed for the Player/Renderer.

- **Pseudo-Code**:

  **`src/hooks/useVideoFrame.js`**:
  ```javascript
  export function useVideoFrame(helios) {
    // State: frame
    // Effect: subscribe to helios, update frame
    // return frame
  }
  ```

  **`src/App.jsx`**:
  ```jsx
  // Import Helios, interpolate (if avail) or use math

  export default function App() {
    const frame = useVideoFrame(helios);
    // Simple animation: Opacity 0->1 over 30 frames
    const opacity = Math.min(1, frame / 30);

    return (
      <div style={{
        opacity,
        transform: `scale(${opacity})`,
        width: 100, height: 100, background: 'red'
      }}>
        Frame: {frame.toFixed(2)}
      </div>
    );
  }
  ```

  **`vite.config.js`**:
  - Must include alias for `/packages/` if needed, or rely on relative imports. Prefer relative imports in example code for clarity, but config might need alias support if we use absolute paths. (Follow `react-canvas-animation` pattern).

- **Dependencies**:
  - `react`, `react-dom` (already in root package.json).

# 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` (should build `react-dom-animation`).
  2. Run `npx ts-node tests/e2e/verify-render.ts` (should pass all cases including new one).
- **Success Criteria**:
  - The build artifacts appear in `output/example-build/examples/react-dom-animation/`.
  - The verification script logs `✅ React DOM Passed!`.
  - A video file `output/react dom-render-verified.mp4` is generated.
