---
title: "Core API"
description: "API Reference for @helios-project/core"
---

# Core API

The `@helios-project/core` package provides the fundamental building blocks for Helios compositions.

## Helios Class

The main class that manages the animation state and timing.

### Constructor

```typescript
const helios = new Helios(options: HeliosOptions);
```

**`HeliosOptions`**:
- `duration` (number): Duration of the composition in seconds.
- `fps` (number): Frames per second.
- `width` (number, optional): Width of the composition.
- `height` (number, optional): Height of the composition.
- `id` (string, optional): Unique ID for the composition.

### Methods

#### `bindToDocumentTimeline()`
Binds the Helios instance to the browser's `requestAnimationFrame` loop. This allows the animation to play in the browser.

```typescript
helios.bindToDocumentTimeline();
```

#### `subscribe(listener)`
Subscribes to state updates. Returns an unsubscribe function.

```typescript
const unsubscribe = helios.subscribe((state) => {
  console.log(state.currentFrame);
});
```

#### `getState()`
Returns the current state of the Helios instance.

```typescript
const state = helios.getState();
// state.currentFrame, state.isPlaying, state.time
```

#### `start()` / `stop()` / `pause()`
Control playback.

#### `seek(frame)`
Jump to a specific frame.

## Signals

Helios provides a signals implementation for reactive state management.

### `signal(initialValue)`
Creates a writable signal.

```typescript
import { signal } from '@helios-project/core';

const count = signal(0);
console.log(count()); // 0
count.set(1);
console.log(count()); // 1
```

### `computed(fn)`
Creates a read-only signal that derives its value from other signals.

```typescript
const double = computed(() => count() * 2);
```

### `effect(fn)`
Runs a side effect whenever dependencies change.

```typescript
effect(() => {
  console.log('Count changed:', count());
});
```

## Sequencing

Helpers for arranging animations in time.

### `sequence(animations)`
Arranges animations sequentially.

```typescript
import { sequence } from '@helios-project/core';

const timeline = sequence([
  { duration: 30, easing: 'ease-out' },
  { duration: 60, easing: 'linear' }
]);
```

### `series(items, options)`
Layout items in a sequence with optional offsets.

## Animation Helpers

### `spring(options)`
Physics-based spring animation.

### `interpolate(value, inputRange, outputRange, options)`
Interpolates a value from an input range to an output range.

```typescript
import { interpolate } from '@helios-project/core';

const opacity = interpolate(frame, [0, 30], [0, 1]);
```
