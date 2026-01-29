---
name: example-chartjs
description: Chart.js integration patterns for Helios. Use when creating animated data visualizations with Chart.js.
---

# Chart.js + Helios

Integrate Helios with Chart.js by disabling internal animations and manually driving data updates from the timeline.

## Quick Start

```typescript
import { Helios } from '@helios-project/core';
import Chart from 'chart.js/auto';

const helios = new Helios({ fps: 30, duration: 5 });
helios.bindToDocumentTimeline();

const ctx = document.getElementById('chart').getContext('2d');

const chart = new Chart(ctx, {
    type: 'bar',
    data: { /* ... */ },
    options: {
        // CRITICAL: Disable internal tweens
        animation: false,
        responsive: true
    }
});

helios.subscribe((state) => {
    const t = state.currentTime;

    // 1. Calculate new data based on time
    const newData = calculateData(t);

    // 2. Update chart data
    chart.data.datasets[0].data = newData;

    // 3. Force immediate update without animation
    chart.update('none');
});
```

## Key Patterns

### Disable Animations

Chart.js has a built-in animation engine that tweens values when data changes. This conflicts with frame-by-frame rendering. You must disable it:

```javascript
options: {
  animation: false
}
```

### Immediate Updates

When updating the chart in the `subscribe` loop, use mode `'none'` to tell Chart.js to re-render immediately without trying to animate the transition.

```javascript
chart.update('none');
```

## Source Files

- Example: `examples/chartjs-animation/`
