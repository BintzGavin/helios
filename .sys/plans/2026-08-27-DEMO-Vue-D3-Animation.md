# Context & Goal
- **Objective**: Create `examples/vue-d3-animation` to demonstrate D3.js integration with Vue 3 and Helios.
- **Trigger**: Vision gap. While Vanilla D3 exists and React D3 is planned, Vue developers lack a reference implementation for high-performance data visualization.
- **Impact**: Demonstrates the "Hybrid" pattern in Vue (Vue for container/lifecycle, D3 for math/updates), enabling frame-perfect charts.

# File Inventory
- **Create**:
  - `examples/vue-d3-animation/composition.html`: Entry point.
  - `examples/vue-d3-animation/src/main.js`: Vue mount point.
  - `examples/vue-d3-animation/src/data.js`: Data series (copy from vanilla `examples/d3-animation/src/data.js`).
  - `examples/vue-d3-animation/src/App.vue`: Main component logic.
  - `examples/vue-d3-animation/package.json`: Dependencies (`vue`, `d3`).
- **Modify**:
  - `examples/README.md`: Add entry for the new example.
- **Read-Only**: `packages/core/src/index.ts`.

# Implementation Spec
- **Architecture**:
  - **Framework**: Vue 3 (Composition API).
  - **Visualization**: D3.js v7.
  - **Timing**: `@helios-project/core`.
  - **Pattern**:
    - `setup()` initializes `Helios`.
    - `onMounted` creates the SVG structure (or selects the template ref) and initializes D3 scales/axes.
    - `helios.subscribe` drives the update loop, selecting elements via D3 and updating attributes based on `currentFrame`.
    - `onUnmounted` cleans up the subscription.
- **Pseudo-Code (`App.vue`)**:
  ```vue
  <script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { Helios } from '@helios-project/core';
  import * as d3 from 'd3';
  import { DATA_SERIES } from './data';

  const svgRef = ref(null);
  const helios = new Helios({ duration: 5, fps: 30 });
  helios.bindToDocumentTimeline();

  onMounted(() => {
    const svg = d3.select(svgRef.value);

    // Init Scales (x, y) based on DATA_SERIES
    // Render initial Axes

    const unsubscribe = helios.subscribe(({ currentFrame, fps }) => {
       const time = currentFrame / fps;

       // Calculate interpolation
       // Select bars and update attributes
    });

    onUnmounted(unsubscribe);
  });
  </script>
  <template>
    <svg ref="svgRef" width="800" height="600"></svg>
  </template>
  ```
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm run build:examples`
- **Success Criteria**:
  - Build succeeds.
  - `output/example-build/examples/vue-d3-animation/composition.html` exists.
- **Edge Cases**: Ensure D3 selects the correct element even if multiple instances exist (use refs).
