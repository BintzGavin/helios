---
title: "Animation Libraries"
description: "Using external animation libraries with Helios"
---

# Animation Libraries

Helios is designed to be agnostic to the animation library you use. Whether it's GSAP, Framer Motion, Motion One, or Three.js, Helios can synchronize with it.

## General Principle

The core principle for integrating any library is **time synchronization**. Helios drives the "time" of your application. Your animation library must allow you to:
1.  **Pause** its internal clock (or prevent it from running automatically).
2.  **Seek** or **Set Time** to a specific value provided by Helios.

## GSAP

GSAP (GreenSock Animation Platform) is fully supported. You can use GSAP Timelines and synchronize them with Helios.

### Example

```tsx
import { useEffect, useRef } from 'react';
import { useHelios } from './useHelios';
import gsap from 'gsap';

export const MyComponent = () => {
  const { currentFrame, fps } = useHelios();
  const boxRef = useRef(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Create a paused timeline
    const tl = gsap.timeline({ paused: true });

    tl.to(boxRef.current, { x: 500, duration: 2, ease: "power2.inOut" })
      .to(boxRef.current, { rotation: 360, duration: 1 }, "-=1");

    timelineRef.current = tl;

    return () => { tl.kill(); };
  }, []);

  // Sync GSAP time with Helios frame
  useEffect(() => {
    if (timelineRef.current) {
      const timeInSeconds = currentFrame / fps;
      timelineRef.current.time(timeInSeconds);
    }
  }, [currentFrame, fps]);

  return <div ref={boxRef} className="box" />;
};
```

## Framer Motion

Framer Motion can be driven by using `useMotionValue` and manually updating it.

### Example

```tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useHelios } from './useHelios';
import { useEffect } from 'react';

export const MyComponent = () => {
  const { currentFrame, fps } = useHelios();
  const time = useMotionValue(0);

  // Map time to properties
  const x = useTransform(time, [0, 2], [0, 500]); // 0 to 2 seconds -> 0px to 500px
  const opacity = useTransform(time, [0, 1], [0, 1]);

  useEffect(() => {
    time.set(currentFrame / fps);
  }, [currentFrame, fps, time]);

  return <motion.div style={{ x, opacity }} />;
};
```

## Motion One

Motion One is built on the Web Animations API (WAAPI). If you enable `autoSyncAnimations: true` in Helios, it may work automatically. However, for explicit control:

```typescript
import { animate } from "motion";

// Create an animation but pause it immediately
const animation = animate(".box", { x: 100 }, { duration: 1, autoplay: false });

// In your update loop (e.g. useHelios effect)
animation.currentTime = (currentFrame / fps) * 1000; // Motion One uses milliseconds
```

## Lottie

Lottie animations can be synchronized by using the `goToAndStop` method.

```tsx
import Lottie from 'lottie-react';
import animationData from './data.json';
import { useRef, useEffect } from 'react';
import { useHelios } from './useHelios';

export const LottieExample = () => {
  const { currentFrame } = useHelios();
  const lottieRef = useRef(null);

  useEffect(() => {
    if (lottieRef.current) {
      // Lottie uses frames directly
      lottieRef.current.goToAndStop(currentFrame, true);
    }
  }, [currentFrame]);

  return <Lottie lottieRef={lottieRef} animationData={animationData} autoplay={false} />;
};
```

## P5.js

P5.js in **Instance Mode** allows you to pass the `p5` instance to a wrapper and drive the `draw` loop manually or use the frame count to calculate state.

```typescript
const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(400, 400);
    p.noLoop(); // Disable internal loop
  };

  p.draw = () => {
    // Access Helios state globally or passed in
    const time = window.heliosState.currentFrame / window.heliosState.fps;

    p.background(220);
    p.circle(p.width / 2, p.height / 2, Math.sin(time) * 100);
  };
};
```

## Three.js / React Three Fiber

For 3D scenes, use `useFrame` in React Three Fiber, but ensure you use the Helios clock instead of the internal clock.

```tsx
import { useFrame } from '@react-three/fiber';
import { useHelios } from './useHelios';

const RotatingBox = () => {
  const { currentFrame, fps } = useHelios();
  const mesh = useRef();

  useFrame(() => {
    const time = currentFrame / fps;
    mesh.current.rotation.x = time;
    mesh.current.rotation.y = time * 0.5;
  });

  return <mesh ref={mesh} ... />;
};
```
