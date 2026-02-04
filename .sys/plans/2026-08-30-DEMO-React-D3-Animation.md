# 📋 Plan: React D3 Animation Example

#### 1. Context & Goal
- **Objective**: Implement the missing `examples/react-d3-animation` to demonstrate D3.js integration with React.
- **Trigger**: Vision gap; React + D3 is a primary use case ("Use What You Know") but currently only exists for Vanilla and Vue. A previous plan (`2026-08-29`) identified this but was not implemented.
- **Impact**: Unlocks a clear reference implementation for users wanting to build data visualizations with React and Helios, demonstrating the imperative-inside-declarative pattern.

#### 2. File Inventory
- **Create**:
    - `examples/react-d3-animation/package.json`
    - `examples/react-d3-animation/vite.config.ts`
    - `examples/react-d3-animation/composition.html`
    - `examples/react-d3-animation/src/main.jsx`
    - `examples/react-d3-animation/src/App.jsx`
    - `examples/react-d3-animation/src/data.js`
    - `examples/react-d3-animation/tsconfig.json`
- **Modify**: None.
- **Read-Only**: `examples/vue-d3-animation/src/data.js` (Reference).

#### 3. Implementation Spec
- **Architecture**:
    - **React**: Manages the DOM container (`<svg ref={ref}>`).
    - **D3**: Manages the SVG internals (axes, bars) via `d3-selection`.
    - **Helios**: Drives the animation loop via `subscribe()`.
    - **Pattern**: "Uncontrolled Component" pattern where React renders the root and D3 takes over for high-performance frame updates.
- **Pseudo-Code**:
    ```javascript
    // src/App.jsx
    import { Helios } from '@helios-project/core';
    import * as d3 from 'd3';
    import { DATA_SERIES } from './data';

    const helios = new Helios({ duration: 5, fps: 30 });
    helios.bindToDocumentTimeline();

    export default function App() {
      const svgRef = useRef(null);
      useEffect(() => {
        const svg = d3.select(svgRef.current);
        // Init scales/axes...
        const unsubscribe = helios.subscribe((state) => {
             // Calculate time
             // Interpolate data
             // Update D3 elements
        });
        return unsubscribe;
      }, []);
      return <svg ref={svgRef} />;
    }
    ```
- **Dependencies**: `react`, `react-dom`, `d3`, `@helios-project/core`.

#### 4. Test Plan
- **Verification**:
    1.  `npm install` (root) to link workspace.
    2.  `npm run build:examples` to verify build config compatibility.
    3.  `npx tsx tests/e2e/verify-client-export.ts "React D3 Animation"` to verify rendering.
- **Success Criteria**:
    - Build output exists in `output/example-build/examples/react-d3-animation/`.
    - E2E test passes.
