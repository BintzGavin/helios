---
title: "D3 Animation"
description: "Data visualization animation with D3.js and Helios"
---

# D3 Animation

This example demonstrates how to animate a D3.js data visualization using Helios for timing.

## Concept

D3.js is powerful for manipulating the DOM based on data. While D3 has its own transition system, for video rendering we want frame-perfect control. We achieve this by:
1.  Creating a `update(time)` function that calculates the state of the chart for any given timestamp.
2.  Calling this function inside the Helios subscription.

## Implementation

### Setup

```javascript
import { Helios } from '@helios-project/core';
import * as d3 from 'd3';

const duration = 5;
const helios = new Helios({ duration, fps: 30 });
helios.bindToDocumentTimeline();
```

### The Update Function

The core logic interpolates data based on time.

```javascript
function update(time) {
    const totalIntervals = DATA_SERIES.length - 1;
    const intervalDuration = duration / totalIntervals;
    const clampedTime = Math.min(Math.max(time, 0), duration);

    // Find current data interval
    let currentIntervalIndex = Math.floor(clampedTime / intervalDuration);
    if (currentIntervalIndex >= totalIntervals) currentIntervalIndex = totalIntervals - 1;

    // Calculate normalized time (t) within the interval [0, 1]
    let t = (clampedTime - (currentIntervalIndex * intervalDuration)) / intervalDuration;
    t = Math.max(0, Math.min(1, t));

    // Interpolate data values
    const startData = DATA_SERIES[currentIntervalIndex];
    const endData = DATA_SERIES[currentIntervalIndex + 1] || startData;

    const interpolatedData = startData.map(d => {
        const endD = endData.find(ed => ed.name === d.name) || d;
        return {
            name: d.name,
            value: d.value + (endD.value - d.value) * t, // Linear interpolation
            color: d.color
        };
    });

    // Update D3 elements
    const bars = barGroup.selectAll("rect")
        .data(interpolatedData, d => d.name);

    bars.enter()
        .append("rect")
        .attr("fill", d => d.color)
        .merge(bars)
        .attr("x", d => x(d.name))
        .attr("y", d => y(d.value))
        .attr("height", d => y(0) - y(d.value))
        .attr("width", x.bandwidth());

    bars.exit().remove();
}
```

### Subscription

Connect the update loop to Helios.

```javascript
helios.subscribe(({ currentFrame, fps }) => {
    const time = currentFrame / fps;
    update(time);
});
```
