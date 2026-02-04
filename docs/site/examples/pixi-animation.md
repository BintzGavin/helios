---
title: "PixiJS Animation"
description: "Integrating PixiJS (v8) with Helios"
---

# PixiJS Animation

This example demonstrates how to integrate [PixiJS](https://pixijs.com/) (version 8) with Helios. PixiJS is a fast 2D rendering engine.

## Key Concepts

- **Manual Ticking**: We disable Pixi's internal ticker (`autoStart: false`) and drive the `app.ticker.update()` method manually within the Helios subscription loop.
- **Time Calculation**: We calculate the time elapsed since the start of the composition and update the Pixi ticker accordingly.
- **Cleanup**: Properly destroy the Pixi application when the component unmounts.

## React Implementation

```tsx
import { useEffect, useRef } from 'react';
import { Application, Sprite, Assets } from 'pixi.js';
import { helios } from './helios'; // Your Helios instance

export function PixiScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new Application();

    const init = async () => {
      await app.init({
        background: '#1099bb',
        resizeTo: containerRef.current,
        autoStart: false // Important: Disable auto ticker
      });
      containerRef.current?.appendChild(app.canvas);

      const texture = await Assets.load('https://pixijs.com/assets/bunny.png');
      const bunny = new Sprite(texture);

      bunny.anchor.set(0.5);
      bunny.x = app.screen.width / 2;
      bunny.y = app.screen.height / 2;

      app.stage.addChild(bunny);

      // Subscribe to Helios updates
      const unsubscribe = helios.subscribe((state) => {
        // Calculate rotation based on time (e.g., 1 revolution per second)
        const time = state.currentFrame / state.fps;
        bunny.rotation = time * Math.PI * 2;

        // Update Pixi ticker manually
        // Note: Pixi v8 ticker.update takes time in generic units, often frames or ms depending on config.
        // For simple scene updates, setting properties directly is often enough.
        // If using internal Pixi animations, you might need to sync ticker.start()/update().
        app.render();
      });

      return () => {
        unsubscribe();
        app.destroy(true, { children: true, texture: true });
      };
    };

    const cleanupPromise = init();

    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

## Other Frameworks

The logic is identical for Vue, Svelte, and SolidJS:
1. Initialize `Application` with `autoStart: false`.
2. Subscribe to `helios`.
3. Update scene properties based on `state.currentFrame`.
4. Call `app.render()`.
5. Cleanup on destroy.
