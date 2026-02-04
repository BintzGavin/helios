# Spec: React Chart.js Animation

## 1. Context & Goal
- **Objective**: Create `examples/react-chartjs-animation` to demonstrate integrating Chart.js with React in a Helios composition.
- **Trigger**: Vision Gap - "Any framework... Any animation library". Chart.js is a standard tool for data visualization but lacks a React integration example in the repo.
- **Impact**: Provides a reference pattern for users building data-driven video templates (dashboards, reports) using the industry-standard Chart.js library with React, ensuring frame-perfect synchronization.

## 2. File Inventory
- **Create**:
    - `examples/react-chartjs-animation/package.json`: Minimal package config (optional, but good practice).
    - `examples/react-chartjs-animation/vite.config.ts`: Vite config with aliases for core packages.
    - `examples/react-chartjs-animation/composition.html`: The entry point for the composition.
    - `examples/react-chartjs-animation/src/main.tsx`: Entry point bootstrapping Helios and React.
    - `examples/react-chartjs-animation/src/App.tsx`: Main component housing the visualization.
    - `examples/react-chartjs-animation/src/Chart.tsx`: Reusable Chart component encapsulating the integration logic.
- **Modify**: None (Root `package.json` already contains `chart.js` and `react`).
- **Read-Only**: `packages/core`, `packages/cli` (for testing).

## 3. Implementation Spec
- **Architecture**:
    - **Framework**: React 19.
    - **Library**: `chart.js` (v4) used directly (no wrapper) to ensure explicit control over updates.
    - **Pattern**:
        - `Chart.tsx` uses a `ref` to access the `<canvas>`.
        - `useEffect` initializes the `Chart` instance with `animation: false`.
        - `useVideoFrame()` (from `@helios-project/core` generic hook pattern or custom implementation) subscribes to frame updates.
        - Inside the subscription/effect, new data is calculated based on `currentFrame` and applied to `chart.data`.
        - `chart.update('none')` is called to render the frame synchronously.
- **Pseudo-Code (`Chart.tsx`)**:
  ```tsx
  import { useEffect, useRef } from 'react';
  import Chart from 'chart.js/auto';
  import { useVideoFrame } from './hooks'; // or @helios-project/react-adapter if available

  export function ChartComponent() {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const chartRef = useRef<Chart | null>(null);

      // Use the frame signal
      const { time } = useVideoFrame();

      useEffect(() => {
          if (!canvasRef.current) return;

          chartRef.current = new Chart(canvasRef.current, {
              type: 'bar',
              data: { ... },
              options: {
                  animation: false, // Critical for frame sync
                  responsive: true,
                  maintainAspectRatio: false
              }
          });

          return () => chartRef.current?.destroy();
      }, []);

      useEffect(() => {
          if (!chartRef.current) return;

          // Calculate data based on time
          // e.g. Math.sin(time)
          const newData = ...;

          chartRef.current.data.datasets[0].data = newData;
          chartRef.current.update('none'); // Synchronous update
      }, [time]);

      return <div style={{ width: '100%', height: '100%' }}><canvas ref={canvasRef} /></div>;
  }
  ```
- **Dependencies**:
    - `chart.js` (Root dependency).
    - `react`, `react-dom` (Root dependencies).

## 4. Test Plan
- **Verification**:
    1.  Run `npm run build:examples` to ensure the new example compiles correctly with the root build system.
    2.  Run `npx helios render examples/react-chartjs-animation/composition.html -o output.mp4` to generate a video.
- **Success Criteria**:
    - Build completes without error.
    - `output.mp4` is generated.
    - The video shows a bar chart animating smoothly (not static, not jumping).
- **Edge Cases**:
    - **Strict Mode**: Ensure `chart.destroy()` is called in cleanup to prevent "Canvas is already in use" errors or double charts during development.
