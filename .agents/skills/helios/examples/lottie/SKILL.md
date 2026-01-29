---
name: example-lottie
description: Lottie integration patterns for Helios. Use when rendering Lottie (Bodymovin) JSON animations synchronously with Helios.
---

# Lottie + Helios

Integrate Lottie (lottie-web) with Helios by manually seeking the Lottie instance based on the Helios timeline.

## Quick Start

```typescript
import { Helios } from '@helios-project/core';
import lottie from 'lottie-web';
import animationData from './animation.json';

const helios = new Helios({ fps: 30, duration: 5 });

const container = document.getElementById('lottie-container');

// 1. Load Animation (Autoplay OFF)
const anim = lottie.loadAnimation({
  container,
  renderer: 'svg', // or 'canvas'
  loop: false,
  autoplay: false, // Critical
  animationData
});

// 2. Drive with Helios
helios.subscribe(({ currentFrame, fps }) => {
  // Convert to milliseconds
  const timeMs = (currentFrame / fps) * 1000;

  // Seek to exact time
  // Second arg 'false' means "time based", not "frame based"
  // (Lottie frames != Helios frames usually)
  anim.goToAndStop(timeMs, false);
});
```

## Key Patterns

### Time-Based Seeking

Lottie animations have their own internal frame rate. It is usually safer and smoother to seek by time (milliseconds) rather than trying to map Helios frames to Lottie frames, unless you strictly control both.

```javascript
anim.goToAndStop(timeMs, false);
```

### Renderer Choice

- **`svg`**: Good for crisp vectors in DOM mode.
- **`canvas`**: Better for performance in Canvas mode or complex scenes.

## Source Files

- Example: `examples/lottie-animation/`
