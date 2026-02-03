---
title: "Lottie Animation"
description: " integrating Lottie animations with Helios"
---

# Lottie Animation

This example demonstrates how to integrate [Lottie](https://airbnb.io/lottie/#/) (via `lottie-web`) with Helios. By default, Lottie runs on its own internal clock. To synchronize it with Helios (and ensuring it renders correctly frame-by-frame), we must disable Lottie's autoplay and drive it manually using the Helios timeline.

## Key Concepts

- **Manual Driving**: Initialize Lottie with `autoplay: false`.
- **Frame Sync**: Use `helios.subscribe()` to update the Lottie animation frame based on `currentFrame`.
- **Seek Mode**: Use `anim.goToAndStop(value, isFrame)` to seek to a specific point.

## Implementation

```typescript
import { Helios } from '@helios-project/core';
import lottie from 'lottie-web';
import animationData from './animation.json';

const helios = new Helios({
  duration: 5,
  fps: 30,
});

const container = document.getElementById('lottie-container');

if (container) {
    // 1. Load the animation, ensuring it doesn't play automatically
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg', // or 'canvas'
      loop: false,
      autoplay: false,
      animationData: animationData,
    });

    // 2. Subscribe to Helios updates
    helios.subscribe(({ currentFrame, fps }) => {
      // Calculate time in milliseconds
      const timeMs = (currentFrame / fps) * 1000;

      // 3. Drive Lottie manually
      // goToAndStop(value, isFrame) - we pass false to indicate time in ms
      anim.goToAndStop(timeMs, false);
    });
}
```

## Why this works

When Helios renders (using the Renderer), it steps through the timeline frame by frame (e.g., frame 0, 1, 2...). Because we bound the Lottie animation state to `currentFrame` in the subscription callback, the Lottie animation will be in the exact correct state for every frame captured, guaranteeing perfect synchronization in the output video.
