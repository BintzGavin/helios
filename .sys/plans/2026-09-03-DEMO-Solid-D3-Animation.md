# Plan: Create SolidJS D3 Animation Example

#### 1. Context & Goal
- **Objective**: Create `examples/solid-d3-animation` to demonstrate D3.js integration with SolidJS and Helios.
- **Trigger**: The `examples/` directory contains D3 examples for React, Vue, and Svelte, but is missing one for SolidJS, creating a parity gap.
- **Impact**: Completes the D3 support matrix across all major frameworks (React, Vue, Svelte, Solid) and demonstrates the "Takeover Mode" pattern in SolidJS where D3 manages DOM updates driven by Helios.

#### 2. File Inventory
- **Create**:
    - `examples/solid-d3-animation/package.json`: Defines dependencies (`solid-js`, `d3`, `@helios-project/core`).
    - `examples/solid-d3-animation/vite.config.js`: Vite configuration with `vite-plugin-solid`.
    - `examples/solid-d3-animation/composition.html`: HTML entry point.
    - `examples/solid-d3-animation/src/index.tsx`: Application bootstrap and Helios initialization.
    - `examples/solid-d3-animation/src/App.tsx`: Main component implementing the D3 bar chart with Helios subscription.
    - `examples/solid-d3-animation/src/data.js`: Deterministic data series for the animation (ported from React example).
- **Modify**:
    - `vite.build-example.config.js`: Update the `include` regex for `solidPlugin` and `exclude` regex for `react` plugin to recognize the new `solid-d3-animation` directory.
- **Read-Only**:
    - `examples/react-d3-animation/src/data.js`: Source of truth for data.

#### 3. Implementation Spec
- **Architecture**:
    - Uses **SolidJS** for the component tree but allows **D3** to take over the DOM within a specific `ref`.
    - `Helios` instance is created and bound to the document timeline (`bindToDocumentTimeline()`).
    - The `App` component uses `onMount` to initialize the D3 chart (SVG, Axes).
    - A `helios.subscribe` callback is registered inside `onMount` to update the chart attributes frame-by-frame using D3 selections.
    - `onCleanup` handles unsubscription.
    - This pattern avoids fighting with Solid's fine-grained reactivity for the chart internals, effectively treating the chart as a "black box" driven by the frame clock, which is idiomatic for D3 "Takeover Mode".
- **Pseudo-Code (App.tsx)**:
    ```typescript
    import { onMount, onCleanup } from 'solid-js';
    import * as d3 from 'd3';
    import { DATA_SERIES } from './data';

    // Global helios instance from index.tsx or import

    export default function App() {
        let svgRef;

        onMount(() => {
            // D3 Setup (scales, axes, initial render)
            const svg = d3.select(svgRef)...;

            // Define update(time) function that calculates interpolation
            // based on DATA_SERIES and time

            // Subscribe to helios
            const unsubscribe = helios.subscribe(({ currentFrame, fps }) => {
                update(currentFrame / fps);
            });

            onCleanup(unsubscribe);
        });

        return <svg ref={svgRef} />;
    }
    ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    - Run `npm run build:examples`.
- **Success Criteria**:
    - Build process completes without error.
    - `output/example-build/examples/solid-d3-animation/composition.html` exists.
- **Edge Cases**:
    - `vite.build-example.config.js` regex must be exact or the Solid compiler won't run on the new directory.
