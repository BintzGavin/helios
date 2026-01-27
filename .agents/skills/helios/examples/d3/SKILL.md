---
name: example-d3-animation
description: Learn how to use D3.js with Helios for data visualization. Use when creating charts, graphs, or data-driven animations.
---

# D3.js Animation

Integrate D3.js with Helios by driving D3 scales and attributes using the Helios frame/time state.

## Quick Start

```typescript
import { Helios } from '@helios-project/core';
import * as d3 from 'd3';

const helios = new Helios({ duration: 5, fps: 60 });
const svg = d3.select('#chart');

// Data
const data = [10, 20, 30, 40, 50];

// Setup D3
const x = d3.scaleLinear().domain([0, 50]).range([0, 500]);
const bars = svg.selectAll('rect').data(data).enter().append('rect')
  .attr('height', 20)
  .attr('y', (d, i) => i * 25);

// Animate
helios.subscribe(({ currentFrame, fps }) => {
  const time = currentFrame / fps;

  // Update D3 attributes based on time
  bars.attr('width', d => x(d) * Math.min(1, time));
});
```

## Key Patterns

### Frame-Driven Scales
Instead of using `d3.transition()`, use `helios.subscribe()` to update attributes on every frame. This ensures frame-perfect rendering and seeking.

```typescript
helios.subscribe((state) => {
  const t = state.currentFrame / (state.duration * state.fps); // 0 to 1

  // Interpolate data
  const interpolatedData = data.map(d => d * t);

  // Re-bind and render
  path.datum(interpolatedData).attr('d', lineGenerator);
});
```

## Common Issues

- **d3.transition():** Do NOT use `d3.transition()`. It relies on internal timers that won't sync with Helios's seek/render cycle. Always set attributes directly in the subscription callback.
- **Performance:** For large datasets, consider using Canvas with D3 (`d3-force` + Canvas API) instead of SVG for better performance.

## Source
- Example: `examples/d3-animation/`
