# Plan: Scaffold Chart.js Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/chartjs-animation` that demonstrates how to integrate Chart.js (a popular charting library) with Helios.
- **Trigger**: Vision gap - "Use What You Know". Chart.js is widely used for data visualization, and users need a pattern for driving it frame-by-frame.
- **Impact**: Unlocks "Business Intelligence" video use cases (financial reports, analytics) and demonstrates integration with stateful external canvas libraries.

## 2. File Inventory
- **Create**:
  - `examples/chartjs-animation/composition.html`: The entry point HTML.
  - `examples/chartjs-animation/src/main.ts`: The TypeScript logic driving Chart.js.
- **Modify**:
  - `vite.build-example.config.js`: Register the new example entry point.
  - `tests/e2e/verify-render.ts`: Add a test case for the new example.
- **Read-Only**:
  - `package.json`: To check/add `chart.js` dependency.

## 3. Implementation Spec
- **Architecture**:
  - **Dependency**: `chart.js` (needs to be installed by Executor).
  - **Pattern**: "External State Drive". Helios calculates the data for the current frame, updates the Chart.js data object, and calls `chart.update('none')` to render synchronously without internal interpolation.
- **Pseudo-Code**:
  ```typescript
  // Use relative import matching other examples
  import { Helios } from '../../../packages/core/src/index';
  // Executor must install chart.js
  import Chart from 'chart.js/auto';

  // Init Helios
  const helios = new Helios({ fps: 30, duration: 5 });
  helios.bindToDocumentTimeline();

  // Init Chart
  const ctx = document.getElementById('chart').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['A', 'B', 'C', 'D', 'E'],
      datasets: [{
        label: 'Sales',
        data: [10, 20, 30, 40, 50],
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    options: {
      animation: false, // Vital: Disable internal animation
      responsive: true,
      maintainAspectRatio: false
    }
  });

  // Subscribe
  helios.subscribe((state) => {
    const t = state.currentFrame / 30; // seconds

    // Animate data based on time
    // Example: Sine wave animation for bar heights
    const newData = chart.data.labels.map((_, i) => {
      return 50 + 40 * Math.sin(t * 2 + i);
    });

    chart.data.datasets[0].data = newData;
    chart.update('none'); // Render immediately
  });
  ```
- **Dependencies**:
  - `npm install chart.js` (Executor must run this).

## 4. Test Plan
- **Verification**:
  - Run `npm install chart.js`
  - Run `npm run build:examples`
  - Run `npx ts-node tests/e2e/verify-render.ts`
- **Success Criteria**:
  - The E2E test `ChartJS` passes.
  - The output video `output/chartjs-animation-render-verified.mp4` shows smooth animation of chart bars.
- **Pre-Commit**:
  - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
