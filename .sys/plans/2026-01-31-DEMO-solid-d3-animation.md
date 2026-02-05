# Spec: SolidJS D3 Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/solid-d3-animation` demonstrating how to integrate D3.js with SolidJS and Helios.
- **Trigger**: The "Use What You Know" vision promises support for standard libraries across all frameworks, but a SolidJS + D3 example is missing, creating a parity gap with React, Vue, and Svelte.
- **Impact**: Unblocks users wanting to use D3 for data visualization in SolidJS-based Helios videos. Completes D3 parity across all supported frameworks.

## 2. File Inventory
- **Create**:
  - `examples/solid-d3-animation/package.json`: Project manifest with dependencies (`solid-js`, `d3`, `@helios-project/core`).
  - `examples/solid-d3-animation/vite.config.js`: Vite configuration using `vite-plugin-solid`.
  - `examples/solid-d3-animation/composition.html`: Entry point HTML for the player.
  - `examples/solid-d3-animation/src/index.tsx`: Application entry point initializing Helios and mounting the app.
  - `examples/solid-d3-animation/src/App.tsx`: Main component containing the D3 logic.
  - `examples/solid-d3-animation/src/data.ts`: Deterministic data series for the animation (matching other D3 examples).
- **Modify**:
  - `vite.build-example.config.js`: Update the SolidJS plugin `include`/`exclude` regex to recognize the new directory.

## 3. Implementation Spec
- **Architecture**:
  - Use `solid-js` Signals/Effects for component lifecycle but rely on **imperative D3** for the actual DOM updates inside the Helios loop.
  - Use `onMount` to initialize the SVG and setup static elements (axes, groups).
  - Use `helios.subscribe()` inside `onMount` to drive the animation frame-by-frame.
  - **Crucial**: Do NOT use D3 transitions/timers. Manually interpolate values based on `helios.currentFrame / helios.fps`.
- **Public API Changes**: None.
- **Dependencies**: None.

### Pseudo-Code (App.tsx)
```tsx
import { onMount, onCleanup } from 'solid-js';
import * as d3 from 'd3';
import { DATA_SERIES } from './data';

export default function App() {
  let svgRef;

  onMount(() => {
    // 1. Setup SVG (width, height, axes)
    const svg = d3.select(svgRef);
    // ... setup scales ...

    // 2. Define Update Function
    function update(time) {
       // ... interpolate data based on time ...
       // ... d3.selectAll(...).data(...).join(...) ...
    }

    // 3. Subscribe to Helios
    // accessing global or imported helios instance
    const unsubscribe = window.helios.subscribe(({ currentFrame, fps }) => {
       update(currentFrame / fps);
    });

    onCleanup(() => unsubscribe());
  });

  return <svg ref={svgRef} />;
}
```

## 4. Test Plan
- **Verification**:
  1. Run `npm install` to link dependencies.
  2. Run `npm run build:examples` to ensure the root build config picks up the new example.
  3. Run `npm run verify:e2e` to ensure the example renders correctly in the headless pipeline.
- **Success Criteria**:
  - `dist/examples/solid-d3-animation/composition.html` exists after build.
  - E2E tests pass for the new example.
- **Edge Cases**:
  - Ensure `onCleanup` removes the subscription to prevent memory leaks during hot reload.
