# Plan: Scaffold React Example

## 1. Context & Goal
- **Objective**: Create a React-based example (`examples/react-canvas-animation`) to demonstrate `useVideoFrame` hook usage.
- **Trigger**: Vision Gap - README promises React support and adapter, but neither exists.
- **Impact**: Unlocks React development workflow, validates framework-agnostic architecture, and provides a reference for the future `react-adapter` package.

## 2. File Inventory
- **Create**:
    - `examples/react-canvas-animation/index.html`: The container page with `<helios-player>`.
    - `examples/react-canvas-animation/composition.html`: The React app entry point (iframe source).
    - `examples/react-canvas-animation/src/main.jsx`: React entry point (mounts App).
    - `examples/react-canvas-animation/src/App.jsx`: Main component rendering the canvas.
    - `examples/react-canvas-animation/src/hooks/useVideoFrame.js`: Custom hook implementation (temporary location until package exists).
    - `examples/react-canvas-animation/vite.config.js`: Vite config for this example (to support React plugin).
- **Modify**:
    - `package.json`:
        - Add `react`, `react-dom`, `@vitejs/plugin-react` to `devDependencies`.
        - Add `"dev:react": "vite serve examples/react-canvas-animation"` to `scripts`.

## 3. Implementation Spec
- **Architecture**:
    - **Dual-HTML Setup**: `index.html` hosts the player, which loads `composition.html` in an iframe.
    - **React Composition**: `composition.html` bootstraps a React app.
    - **Hook Pattern**: `useVideoFrame` hook manages subscription to `Helios` instance and returns reactive state.
    - **Direct Core Usage**: Import `Helios` directly from `../../packages/core/dist/index.js` (mimicking existing examples).
- **Pseudo-Code**:
    ```javascript
    // src/hooks/useVideoFrame.js
    import { useState, useEffect } from 'react';

    export function useVideoFrame(helios) {
        const [frame, setFrame] = useState(helios.getState().currentFrame);
        useEffect(() => {
            const update = (state) => setFrame(state.currentFrame);
            return helios.subscribe(update);
        }, [helios]);
        return frame;
    }

    // src/App.jsx
    import { Helios } from '../../../packages/core/dist/index.js';
    import { useVideoFrame } from './hooks/useVideoFrame';

    const helios = new Helios({ duration: 5, fps: 30 });
    helios.bindToDocumentTimeline();

    export default function App() {
        const frame = useVideoFrame(helios);
        // Draw to canvas based on frame...
        return <canvas ref={canvasRef} />;
    }
    ```
- **Dependencies**: None (internal task).

## 4. Test Plan
- **Verification**:
    1. Run `npm install` (to get new react deps).
    2. Run `npm run dev:react`.
    3. Open browser to the served URL.
- **Success Criteria**:
    - The `<helios-player>` loads.
    - The canvas inside shows animation (e.g., a moving shape).
    - Scrubbing the player updates the canvas (reactivity works).
- **Edge Cases**:
    - Window resize handling (React should handle re-renders or canvas resize).
    - Hot Module Replacement (HMR) should work for the React component.
