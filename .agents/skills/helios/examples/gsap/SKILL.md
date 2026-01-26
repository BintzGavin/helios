---
name: example-gsap
description: Patterns for using Helios with GSAP (GreenSock). Use when integrating GSAP timelines with the Helios timeline for precise scrubbing and rendering.
---

# GSAP Integration Patterns

To use GSAP with Helios, you must drive the GSAP Timeline instance using the Helios frame state. This allows GSAP animations to be scrubbed, paused, and rendered frame-by-frame.

## Quick Start

### The "Paused Timeline" Pattern

1.  Create a GSAP Timeline with `paused: true`.
2.  Subscribe to Helios updates.
3.  Inside the subscription, convert the Helios frame to seconds.
4.  Call `timeline.seek(seconds)` to synchronize.

```html
<script type="module">
  import { Helios } from '@helios-project/core';
  import { gsap } from 'gsap';

  // 1. Initialize Helios
  const helios = new Helios({
    fps: 30,
    durationInSeconds: 5,
  });

  // 2. Setup GSAP Timeline (PAUSED is critical)
  const tl = gsap.timeline({ paused: true });

  // 3. Define animations
  tl.to(".box", {
    rotation: 360,
    x: 100,
    duration: 2,
    ease: "power1.inOut"
  })
  .to(".box", {
    scale: 2,
    duration: 2
  });

  // 4. Subscribe and Sync
  helios.subscribe((state) => {
    // Convert frame count to seconds
    const timeInSeconds = state.currentFrame / helios.fps;

    // Seek GSAP to exact time
    tl.seek(timeInSeconds);
  });

  // 5. Bind for Preview
  helios.bindToDocumentTimeline();
  window.helios = helios;
</script>
```

## Critical Rules

1.  **Always Pause:** The GSAP timeline must be initialized with `{ paused: true }`. If it plays automatically, it will fight with Helios for control.
2.  **Use Seek:** Do not use `tl.progress()` unless you calculate the normalized 0-1 value. `tl.seek(seconds)` is usually more direct since Helios knows FPS and Frame Count.
3.  **No `requestAnimationFrame`:** Do not create your own rAF loop for GSAP. Let Helios drive the updates via `subscribe`.

## Source Files

- Example: `examples/gsap-animation/`
