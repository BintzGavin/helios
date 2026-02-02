---
title: "SolidJS Examples"
description: "Collection of SolidJS animation examples"
---

# SolidJS Examples

SolidJS's fine-grained reactivity model aligns perfectly with Helios's signal-based architecture.

## Solid Canvas Animation

Location: `examples/solid-canvas-animation`

Demonstrates how to drive a Canvas rendering loop using SolidJS effects and Helios signals. It uses a `createHeliosSignal` adapter to bridge Helios state into Solid's reactive system.

## Solid Three.js Animation

Location: `examples/solid-threejs-canvas-animation`

Combines SolidJS with Three.js. Instead of a heavy React-Three-Fiber abstraction, this example shows how to use Solid effects to imperatively update Three.js objects based on Helios timeline state.

## Solid Transitions

Location: `examples/solid-transitions`

Shows how to synchronize standard CSS animations and transitions with the Helios timeline using `autoSyncAnimations: true`. It handles conditional rendering (`<Show>`, `<Switch>`) while ensuring animations play correctly during scrubbing.

## Solid Animation Helpers

Location: `examples/solid-animation-helpers`

Demonstrates building reusable animation primitives:
- **`<Sequence>`**: Manages start times for children.
- **`<Series>`**: Automatically sequences children one after another.

```jsx
<Series>
    <Scene1 duration={2} />
    <Scene2 duration={3} />
</Series>
```

## Solid Captions

Location: `examples/solid-captions-animation`

Renders SRT captions using Solid's `<For>` component and Helios's `activeCaptions` signal.
