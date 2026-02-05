# Context & Goal
- **Objective**: Create `examples/solid-chartjs-animation` to demonstrate how to use Chart.js with SolidJS, driven by the Helios frame clock.
- **Trigger**: The "Use What You Know" matrix gap; SolidJS lacks a Chart.js example while React, Vue, and Svelte have one.
- **Impact**: Unlocks Chart.js usage for SolidJS developers and completes the framework support matrix for this library.

# File Inventory
- **Create**:
    - `examples/solid-chartjs-animation/package.json`: Define dependencies (`solid-js`, `chart.js`, `vite-plugin-solid`).
    - `examples/solid-chartjs-animation/vite.config.js`: Build configuration (using `vite-plugin-solid`).
    - `examples/solid-chartjs-animation/composition.html`: Entry point for Helios.
    - `examples/solid-chartjs-animation/src/index.jsx`: Application entry.
    - `examples/solid-chartjs-animation/src/App.jsx`: Main component integrating Chart.js and Helios.
- **Modify**:
    - `vite.build-example.config.js`: Update `solidPlugin` include regex to support the new example.
- **Read-Only**:
    - `examples/svelte-chartjs-animation/src/Chart.svelte` (reference implementation for logic).
    - `examples/solid-d3-animation/package.json` (reference for dependencies).
    - `examples/solid-d3-animation/vite.config.js` (reference for build config).

# Implementation Spec
- **Architecture**:
    - Use `vite-plugin-solid` for bundling (consistent with `solid-d3-animation`).
    - `App.jsx` uses `onMount` to initialize `Chart.js` on a canvas ref.
    - `helios` instance is imported/created and subscribed to.
    - `helios.subscribe(({ currentFrame }) => ...)` updates chart data.
    - `chart.update('none')` is used for frame-perfect synchronous updates.
    - `animation: false` is set in Chart.js config to disable internal tweening.
    - `onCleanup` handles `chart.destroy()` and `unsubscribe()`.
- **Pseudo-Code**:
    ```javascript
    // examples/solid-chartjs-animation/src/App.jsx
    import { onMount, onCleanup } from 'solid-js';
    import Chart from 'chart.js/auto';
    import { Helios } from '@helios-project/core';

    const helios = new Helios({
        duration: 10,
        fps: 30
    });

    export default function App() {
      let canvasRef;
      let chart;

      onMount(() => {
        chart = new Chart(canvasRef, {
            type: 'bar',
            data: { ... },
            options: { animation: false }
        });

        const unsubscribe = helios.subscribe(state => {
            // Update chart data
            const val = Math.sin(state.currentFrame / 10);
            chart.data.datasets[0].data = [val, val * 2, val * 3];
            chart.update('none');
        });

        onCleanup(() => {
            unsubscribe();
            chart.destroy();
        });
      });

      return <canvas ref={canvasRef} />;
    }
    ```
- **Configuration Updates**:
    - Update `vite.build-example.config.js`:
        - In `solidPlugin({ include: /.../ })`, append `|examples\/solid-chartjs-animation` to the regex.
        - In `react({ exclude: /.../ })`, append `|examples\/solid-chartjs-animation` to the regex.

# Test Plan
- **Verification**:
    - `npm install` to link the new workspace.
    - `npm run build:examples` to ensure it compiles (crucial verification for the config change).
    - `npx helios render examples/solid-chartjs-animation/composition.html` to manual check.
- **Success Criteria**:
    - `npm run build:examples` must pass.
    - Rendered output shows the chart animating smoothly.
- **Edge Cases**:
    - Regex syntax error in `vite.build-example.config.js` (ensure escaping is correct).
