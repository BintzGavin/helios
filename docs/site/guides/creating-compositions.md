---
title: "Creating Compositions"
description: "Learn how to build animations with Helios."
---

# Creating Compositions

A **Composition** is the core concept in Helios. It represents a scene that evolves over time.

## The Loop

At its heart, a composition is a loop:

1.  **Time advances**: The engine calculates the new time/frame.
2.  **State updates**: The engine updates its internal state (currentFrame, etc.).
3.  **Render**: Your code reads the state and updates the visual output (DOM, Canvas, etc.).

## Using Signals

Helios provides **Signals** to manage reactive state. This is especially useful for more complex compositions where you want to derive values efficiently.

```javascript
import { Helios, signal, computed } from '@helios-project/core';

// Create a signal
const x = signal(0);

// Create a computed value
const y = computed(() => x() * 2);

// Update signal in the loop
helios.subscribe((state) => {
  x.set(state.currentFrame);
});

// React to changes
effect(() => {
  draw(x(), y());
});
```

### Stagger & Shift

For more complex timing, use `stagger` and `shift`.

```javascript
import { stagger, shift } from '@helios-project/core';

const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

// Stagger start times by 10 frames
const staggered = stagger(items, 10);

// Shift the whole group later by 30 frames
const shifted = shift(staggered, 30);
```

## Defining Inputs (Schema)

You can define a strongly-typed schema for your composition's inputs. This drives the Studio UI and enables runtime validation.

```typescript
import { Helios } from '@helios-project/core';

const helios = new Helios({
  fps: 30,
  duration: 5,
  schema: {
    // Basic types
    title: { type: 'string', default: 'My Video' },

    // Grouping for Studio UI
    color: { type: 'color', default: '#ff0000', group: 'Appearance' },

    // Constraints
    count: { type: 'number', min: 0, max: 10, step: 1 },
    code: { type: 'string', pattern: '^[A-Z]{3}$', description: '3-letter code' },

    // Asset types
    background: { type: 'image', accept: ['.jpg', '.png'] },

    // Arrays and Objects
    tags: {
      type: 'array',
      items: { type: 'string' }
    }
  }
});
```

## Sequencing

For long animations, it's tedious to calculate frame ranges manually. The `sequence` and `series` helpers make this easier.

### Sequence

Run animations one after another.

```javascript
import { sequence } from '@helios-project/core';

const intro = { duration: 60 }; // 2 seconds at 30fps
const main = { duration: 120 }; // 4 seconds
const outro = { duration: 60 }; // 2 seconds

const timeline = sequence([intro, main, outro]);
// timeline now knows the start frame for each segment
```

### Series

Layout a list of items with staggering.

```javascript
import { series } from '@helios-project/core';

const items = ['A', 'B', 'C', 'D'];

const itemAnimations = series(items, {
    duration: 30, // Each item animates for 30 frames
    offset: 10    // Start the next item 10 frames after the previous one starts
});
```

## Interpolation

Use `interpolate` to map time to values.

```javascript
import { interpolate } from '@helios-project/core';

// Map frame 0-60 to opacity 0-1
const opacity = interpolate(currentFrame, [0, 60], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp'
});
```
