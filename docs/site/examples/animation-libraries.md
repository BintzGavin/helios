---
title: "Animation Libraries"
description: "Using Helios with GSAP and Framer Motion"
---

# Animation Libraries

Helios is designed to be the "source of truth" for time. Most animation libraries (GSAP, Framer Motion) have their own internal clocks. To use them with Helios, you need to manually synchronize them.

## GSAP

The `gsap-animation` example demonstrates how to sync a GSAP Timeline with Helios.

### Key Pattern

1.  Create a GSAP Timeline with `paused: true`.
2.  Subscribe to Helios updates.
3.  In the subscription, calculate the time in seconds.
4.  Call `timeline.seek(time)` on the GSAP instance.

### Example

```javascript
import { Helios } from '@helios-project/core';
import { gsap } from 'gsap';

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

// 1. Create paused timeline
const tl = gsap.timeline({ paused: true });

tl.to(".box", { x: 100, duration: 2 })
  .to(".box", { rotation: 360, duration: 3 });

// 2. Sync
helios.subscribe((state) => {
  const time = state.currentFrame / helios.fps;
  tl.seek(time);
});
```

## Framer Motion

The `framer-motion-animation` example shows how to use `useMotionValue` and `useTransform` to drive animations.

### Key Pattern

1.  Create a `MotionValue` to represent "progress" (0 to 1) or "time".
2.  Update this `MotionValue` in a `useEffect` hooked to Helios frames.
3.  Use `useTransform` to map the progress value to style properties (opacity, scale, etc.).

### Example

```jsx
import { useMotionValue, useTransform, motion } from 'framer-motion';
import { useVideoFrame } from './hooks/useVideoFrame';

export default function App() {
  const frame = useVideoFrame(helios);
  const progress = useMotionValue(0);

  // Sync MotionValue
  useEffect(() => {
    progress.set(frame / totalFrames);
  }, [frame]);

  // Map to styles
  const scale = useTransform(progress, [0, 1], [1, 2]);

  return <motion.div style={{ scale }} />;
}
```
