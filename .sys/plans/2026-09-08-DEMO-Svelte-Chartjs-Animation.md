# Plan: Create Svelte Chart.js Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/svelte-chartjs-animation` to demonstrate how to drive Chart.js visualizations frame-by-frame using Helios and Svelte.
- **Trigger**: Vision gap - "Examples for all frameworks". Chart.js is currently only demonstrated for React and Vue, creating a parity gap for Svelte users.
- **Impact**: Completes the Chart.js matrix for Svelte users, demonstrating the imperative integration pattern (bypassing internal animations for deterministic rendering) which is critical for programmatic video.

## 2. File Inventory
- **Create**:
  - `examples/svelte-chartjs-animation/package.json`: Dependencies (`chart.js`, `svelte`, `@helios-project/core`).
  - `examples/svelte-chartjs-animation/vite.config.ts`: Svelte plugin configuration.
  - `examples/svelte-chartjs-animation/index.html`: Entry point.
  - `examples/svelte-chartjs-animation/src/main.ts`: App mount point.
  - `examples/svelte-chartjs-animation/src/helios.ts`: Singleton Helios instance.
  - `examples/svelte-chartjs-animation/src/App.svelte`: Root component.
  - `examples/svelte-chartjs-animation/src/Chart.svelte`: Chart.js wrapper component.
- **Modify**:
  - `vite.build-example.config.js`: Check if explicit inclusion is needed. (The current config uses `svelte()` which typically handles all Svelte projects, but checking the build artifact is part of verification).
- **Read-Only**:
  - `examples/vue-chartjs-animation/src/components/BarChart.vue`: Reference implementation.

## 3. Implementation Spec
- **Architecture**:
  - **Framework**: Svelte 5 (using standard `onMount`/`bind:this` for canvas refs).
  - **Library**: `chart.js` (Imperative API).
  - **Pattern**:
    - Disable internal Chart.js animations (`animation: false`).
    - Use `helios.subscribe()` to push data updates on every frame.
    - Use `chart.update('none')` for synchronous, performance-optimized rendering.
    - **Note**: This avoids Svelte's reactivity system for the high-frequency chart updates, bridging directly from Helios to Chart.js for max performance.
- **Pseudo-Code**:
  ```typescript
  // src/Chart.svelte
  <canvas bind:this={canvas} />

  <script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import Chart from 'chart.js/auto';
    import { helios } from './helios';

    let canvas: HTMLCanvasElement;
    let chart: Chart;
    let unsubscribe: () => void;

    onMount(() => {
      chart = new Chart(canvas, {
        type: 'bar',
        options: { animation: false }, // Critical
        data: { ... }
      });

      unsubscribe = helios.subscribe(state => {
        // Calculate new data based on state.currentTime
        chart.data.datasets[0].data = calculateData(state.currentTime);
        chart.update('none');
      });
    });

    onDestroy(() => {
      chart?.destroy();
      unsubscribe?.();
    });
  </script>
  ```
- **Dependencies**:
  - `@helios-project/core` (Workspace)
  - `svelte`
  - `chart.js`
  - `@sveltejs/vite-plugin-svelte` (Dev)

## 4. Test Plan
- **Verification**:
  1. `npm install` (root)
  2. `npm run build` (should build the new example via `vite.build-example.config.js`)
  3. `npx tsx tests/e2e/verify-client-export.ts --target svelte-chartjs-animation`
     - *Note*: If `--target` isn't supported, run the full suite or manually check the build output.
- **Success Criteria**:
  - Build succeeds.
  - `output/example-build/examples/svelte-chartjs-animation/composition.html` exists.
  - Example renders a bar chart that animates sinusoidally as the timeline scrubs.
  - No console errors during playback.
- **Edge Cases**:
  - Canvas resizing/responsiveness.
  - Memory leaks (ensure `chart.destroy()` and `unsubscribe()` are called on unmount).
