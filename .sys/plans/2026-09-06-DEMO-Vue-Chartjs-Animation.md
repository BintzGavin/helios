# Plan: Vue Chart.js Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/vue-chartjs-animation` to demonstrate how to integrate Chart.js with Vue 3 and Helios.
- **Trigger**: The Vision promises "Any Framework" support, but we currently only have React and Vanilla examples for Chart.js. This fills the gap for Vue users.
- **Impact**: Unlocks the ability for Vue developers to use rich charting libraries in their videos, proving the "Use What You Know" thesis.

## 2. File Inventory
- **Create**:
  - `examples/vue-chartjs-animation/package.json`: Dependency declaration.
  - `examples/vue-chartjs-animation/vite.config.ts`: Build configuration.
  - `examples/vue-chartjs-animation/composition.html`: Entry point.
  - `examples/vue-chartjs-animation/src/main.ts`: Application entry.
  - `examples/vue-chartjs-animation/src/helios.ts`: Helios singleton instance.
  - `examples/vue-chartjs-animation/src/App.vue`: Root component.
  - `examples/vue-chartjs-animation/src/components/BarChart.vue`: Chart.js integration component.
- **Modify**: None.
- **Read-Only**: `examples/react-chartjs-animation/src/Chart.tsx` (reference).

## 3. Implementation Spec
- **Architecture**:
  - Uses **Vue 3 Composition API** (`script setup`).
  - **Chart.js** initialized in `onMounted` with `animation: false` to disable internal tweens.
  - **Helios** frame updates drive the chart data via `helios.subscribe`.
  - **Synchronous Rendering** enforced via `chart.update('none')`.
- **Pseudo-Code (BarChart.vue)**:
  ```typescript
  // Imports: Vue refs, Chart.js, Helios instance
  // Setup:
  //   - Create canvas ref
  //   - onMounted:
  //     - Init Chart.js instance with dummy data and animation: false
  //     - helios.subscribe(state => {
  //         calculate new data based on state.currentTime (sine wave)
  //         update chart.data
  //         chart.update('none') // Critical: Sync update
  //       })
  //   - onUnmounted: cleanup chart and subscription
  ```
- **Dependencies**:
  - `vue`
  - `chart.js`
  - `@helios-project/core`
  - `@vitejs/plugin-vue` (dev dependency)

## 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure the new example builds correctly.
  - (Manual) Verify that `examples/vue-chartjs-animation/composition.html` exists and contains the correct entry point.
- **Success Criteria**:
  - Build succeeds.
  - Files are created with correct content.
- **Edge Cases**:
  - Ensure `helios` instance is singleton to prevent multiple subscriptions if HMR triggers re-mounts (though for production render it's fine).
