# Plan: Create Svelte D3 Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/svelte-d3-animation` to demonstrate how to integrate D3.js with Svelte and Helios.
- **Trigger**: Vision gap - "Use What You Know" (D3 is a standard tool) and parity with React/Vue D3 examples.
- **Impact**: Provides a reference implementation for Svelte users wanting to use D3 for data visualization in Helios videos.

## 2. File Inventory
- **Create**:
  - `examples/svelte-d3-animation/package.json`: Dependencies.
  - `examples/svelte-d3-animation/vite.config.js`: Vite config with Svelte plugin.
  - `examples/svelte-d3-animation/composition.html`: Entry point.
  - `examples/svelte-d3-animation/src/main.js`: Application entry (JS based on existing patterns).
  - `examples/svelte-d3-animation/src/App.svelte`: Main component with D3 logic.
  - `examples/svelte-d3-animation/src/data.js`: Data source (copied from other examples).

- **Modify**: None.
- **Read-Only**: `examples/react-d3-animation/src/data.js` (for reference).

## 3. Implementation Spec
- **Architecture**:
  - Uses `svelte` for component lifecycle (`onMount`).
  - Uses `d3` for DOM manipulation (scales, axes, entering/exiting elements).
  - Uses `Helios` to drive the animation loop via `.subscribe()`.
  - **Crucial**: Bypasses D3's internal timer/transition mechanisms in favor of Helios's deterministic frame loop.
- **Pseudo-Code (App.svelte)**:
  ```javascript
  import { onMount } from 'svelte';
  import { Helios } from '@helios-project/core';
  import * as d3 from 'd3';

  let svgRef;
  const helios = new Helios({ duration: 5, fps: 30 });
  helios.bindToDocumentTimeline();

  onMount(() => {
    // 1. Setup SVG (width, height, margin)
    // 2. Setup Scales (x, y) & Axes
    // 3. Render initial static elements (axes)

    // 4. Define update(time) function:
    //    - Calculate current data slice based on time
    //    - Interpolate values between keyframes
    //    - Update D3 selection (enter/update/exit)

    // 5. Subscribe to Helios
    const unsubscribe = helios.subscribe(({ currentFrame, fps }) => {
      update(currentFrame / fps);
    });

    return unsubscribe;
  });
  ```
- **Dependencies**: `svelte`, `d3`, `@helios-project/core`, `vite`, `@sveltejs/vite-plugin-svelte`.

## 4. Test Plan
- **Verification**:
  1. `npm install` (to install new dependencies).
  2. `npm run build:examples` (to verify build config).
  3. `node tests/e2e/verify-render.ts svelte-d3` (to verify rendering and duration).
- **Success Criteria**:
  - Build succeeds.
  - `verify-render.ts` passes with "Content verified" (correct duration, non-black frames).
- **Edge Cases**:
  - Ensure `d3` imports work correctly in Svelte+Vite setup.
  - Ensure reactivity doesn't conflict with D3 manual DOM manipulation (using `bind:this` and `d3.select`).
