---
name: workflow-visualize-data
description: Workflow for creating data-driven animations. Use when you need to visualize datasets using D3, P5, or other libraries.
---

# Visualize Data

This workflow guides you through creating data-driven animations in Helios.

## 1. Choose Your Library

- **D3.js:** Best for complex charts, graphs, and SVG-based visualizations.
- **P5.js:** Best for generative art, creative coding, and pixel manipulation (Canvas).
- **Three.js:** Best for 3D data visualization.
- **Vanilla Canvas:** Best for high-performance custom visualizations.

## 2. Prepare Your Data

Load your data (JSON, CSV) and ensure it is available when the composition starts.

```typescript
// Load data
import rawData from './data.json';
```

## 3. Map Time to Data

The core concept is to map the current animation time (or progress) to your data state.

**Linear Interpolation:**
```typescript
helios.subscribe(({ currentFrame, duration, fps }) => {
  const progress = currentFrame / (duration * fps); // 0 to 1

  // Show data up to the current progress
  const visibleData = data.slice(0, Math.floor(data.length * progress));
  render(visibleData);
});
```

**Scale-Driven (D3):**
```typescript
const timeScale = d3.scaleLinear().domain([0, duration]).range([0, maxX]);

helios.subscribe(({ currentFrame, fps }) => {
  const t = currentFrame / fps;
  const currentX = timeScale(t);

  // Update attributes
  d3.selectAll('circle').attr('cx', d => d.x < currentX ? d.x : 0);
});
```

## 4. Handle Interactivity

If you need `inputProps` to control the visualization (e.g., changing datasets or color themes):

```typescript
helios.subscribe((state) => {
  const { theme } = state.inputProps;
  updateColors(theme);
});
```

## Related Skills

- `example-d3-animation`
- `example-p5-animation`
- `example-threejs-animation`
