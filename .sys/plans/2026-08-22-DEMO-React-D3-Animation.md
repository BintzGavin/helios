# Context & Goal
- **Objective**: Create `examples/react-d3-animation` to demonstrate high-performance D3.js integration with React and Helios.
- **Trigger**: Vision gap. The project lacks a framework-integrated D3 example (only Vanilla exists), despite D3 being a core "Use What You Know" use case.
- **Impact**: Provides a canonical reference for React developers needing high-performance data visualization (skipping React reconciliation for frame updates).

# File Inventory
- **Create**:
  - `examples/react-d3-animation/composition.html`: Entry point HTML (standard React pattern with `<div id="root">`).
  - `examples/react-d3-animation/src/main.jsx`: React mount point (using `ReactDOM.createRoot`).
  - `examples/react-d3-animation/src/data.js`: Data series (copied/adapted from Vanilla example).
  - `examples/react-d3-animation/src/App.jsx`: Main application logic.
- **Modify**:
  - *None*: The `vite.build-example.config.js` logic automatically handles new React directories that don't match the "solid-" exclude pattern.
- **Read-Only**: `packages/core/src/index.ts` (Imported).

# Implementation Spec
- **Architecture**:
  - **Framework**: React 18+ (using `react-dom/client`).
  - **Visualization**: D3.js v7 (`d3-selection`, `d3-scale`, `d3-axis`).
  - **Timing**: `@helios-project/core` (`Helios` class).
  - **Integration Pattern**: "Hybrid" Approach.
    - React renders the static SVG structure (`<svg>`, `<g>` containers).
    - `useRef` captures references to these containers.
    - `useLayoutEffect` initializes D3 scales and axes once.
    - `helios.subscribe` drives frame-by-frame updates directly via `d3.select(ref).attr(...)`, bypassing React state/reconciliation for maximum performance.
- **Pseudo-Code (`App.jsx`)**:
  ```jsx
  import React, { useRef, useLayoutEffect } from 'react';
  import { Helios } from '@helios-project/core';
  import * as d3 from 'd3';
  import { DATA_SERIES } from './data';

  const helios = new Helios({ duration: 5, fps: 30 });
  helios.bindToDocumentTimeline();

  export default function App() {
    const gRef = useRef(null);
    const axisRef = useRef(null);

    useLayoutEffect(() => {
      // 1. Init Scales (x, y) based on DATA_SERIES
      // 2. Render initial Axes into axisRef

      // 3. Subscribe to Helios
      const unsubscribe = helios.subscribe(({ currentTime, duration }) => {
         // Calculate t (0..1)
         // Interpolate between DATA_SERIES[frame] and DATA_SERIES[frame+1]
         // Select bars in gRef and update .attr('height'), .attr('y')
      });

      return () => unsubscribe();
    }, []);

    return (
      <svg width={800} height={600}>
        <g ref={axisRef} />
        <g ref={gRef} />
      </svg>
    );
  }
  ```

# Test Plan
- **Verification**: `npm run build:examples`
- **Success Criteria**:
  - Build completes successfully.
  - `output/example-build/examples/react-d3-animation/composition.html` exists.
  - No React/JSX build errors.
