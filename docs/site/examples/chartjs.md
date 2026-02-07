---
title: "Chart.js Animation"
description: "Animating Chart.js charts using Helios."
---

# Chart.js Animation

This example demonstrates how to drive Chart.js visualizations using the Helios timeline.

## Overview

Chart.js has its own internal animation loop. To control it with Helios, we must disable Chart.js's internal animation and manually update the chart data in a `helios.subscribe` callback.

## Code Example

```typescript
import { Helios } from '@helios-project/core';
import Chart from 'chart.js/auto';

// 1. Initialize Helios
const helios = new Helios({ fps: 30, duration: 5 });
helios.bindToDocumentTimeline();

// 2. Initialize Chart.js
const ctx = document.getElementById('chart') as HTMLCanvasElement;
const chart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
            label: 'Sales',
            data: [10, 20, 30],
            backgroundColor: 'rgba(75, 192, 192, 0.6)'
        }]
    },
    options: {
        // Vital: Disable internal animation so we can control it
        animation: false,
        responsive: true
    }
});

// 3. Drive Animation
helios.subscribe((state) => {
    const t = state.currentTime;

    // Animate data based on time
    // Example: Sine wave animation for bar heights
    const newData = chart.data.labels!.map((_, i) => {
        return 50 + 40 * Math.sin(t * 2 + i * 0.5);
    });

    chart.data.datasets[0].data = newData;

    // Render immediately (synchronous update)
    chart.update('none');
});
```

## Key Concepts

- **Disable Internal Animation**: Set `options.animation: false` in Chart.js config.
- **Reactive Update**: Use `helios.subscribe` to update data on every frame.
- **Synchronous Rendering**: Call `chart.update('none')` to force a repaint without transition.
