---
title: "Animation Helpers"
description: "Using Sequence and Series components"
---

# Animation Helpers

To simplify building complex compositions, Helios provides patterns for sequencing animations. These are demonstrated in `react-animation-helpers`, `vue-animation-helpers`, and `svelte-animation-helpers`.

## Core Concepts

-   **`sequence`**: A utility in `@helios-project/core` that calculates delay/start times for a list of items.
-   **`series`**: A utility for sequential layout.

## React Helpers

### `<Sequence>`

A component that renders its children only during a specific time window. It creates a local `FrameContext` so children perceive `frame 0` as the start of the sequence.

```jsx
<Sequence from={0} durationInFrames={30}>
  <MyComponent /> {/* Active from frame 0 to 30 */}
</Sequence>
```

### `<Series>`

A component that automatically arranges its children (`<Sequence>`) sequentially. You don't need to manually calculate `from` props.

```jsx
<Series>
  <Sequence durationInFrames={60}>
    <Intro />
  </Sequence>
  <Sequence durationInFrames={90}>
    <MainContent /> {/* Starts at frame 60 */}
  </Sequence>
  <Sequence durationInFrames={30}>
    <Outro /> {/* Starts at frame 150 */}
  </Sequence>
</Series>
```

## Vue & Svelte

The same patterns are implemented for Vue (using Slots and Provide/Inject) and Svelte (using Context API).

-   **Vue**: Uses `<Series>` and `<Sequence>` components.
-   **Svelte**: Uses `<Series>` and `<Sequence>` components with context stores.
