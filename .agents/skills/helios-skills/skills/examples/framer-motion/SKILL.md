---
name: example-framer-motion
description: Patterns for using Helios with Framer Motion. Use when you want to use Framer Motion's physics and transitions but need frame-perfect synchronization with Helios.
---

# Framer Motion Integration

Framer Motion animations are typically time-based. To synchronize them with Helios (which is frame-based and scrubbable), you must map the Helios frame state to MotionValues.

## Quick Start

### 1. `useVideoFrame` Hook

Ensure you have the `useVideoFrame` hook (see `examples/react/SKILL.md`).

### 2. Map Frames to MotionValues

Use `useTransform` to map the current frame (from `useVideoFrame`) to animation values.

```jsx
import { useMotionValue, useTransform, motion } from 'framer-motion';
import { useVideoFrame } from './hooks/useVideoFrame';

export const MyComponent = ({ helios }) => {
  // 1. Get current frame
  const frame = useVideoFrame(helios);

  // 2. Create a MotionValue for the frame
  const frameMv = useMotionValue(0);

  // Sync MotionValue whenever frame changes
  useEffect(() => {
    frameMv.set(frame);
  }, [frame, frameMv]);

  // 3. Transform Frame -> Animation Value
  // Example: Rotate 360 degrees over 60 frames (0 to 60)
  const rotate = useTransform(frameMv, [0, 60], [0, 360]);

  // Example: Opacity fade in over first 30 frames
  const opacity = useTransform(frameMv, [0, 30], [0, 1]);

  return (
    <motion.div
      style={{
        width: 100,
        height: 100,
        background: 'blue',
        rotate,   // Bind transformed value
        opacity
      }}
    />
  );
};
```

## Advanced: Manual MotionValue Setting

For better performance in deep trees, update a shared `MotionValue` directly in the subscription, bypassing React state.

```jsx
const frameMv = useMotionValue(0);

useEffect(() => {
  const unsubscribe = helios.subscribe((state) => {
    // Update MotionValue directly - no React re-render!
    frameMv.set(state.currentFrame);
  });
  return unsubscribe;
}, [helios, frameMv]);

const x = useTransform(frameMv, [0, 100], [0, 500]);

return <motion.div style={{ x }} />;
```

## Source Files

- Example: `examples/framer-motion-animation/`
