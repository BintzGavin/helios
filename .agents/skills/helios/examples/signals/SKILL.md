---
name: example-signals-animation
description: Learn how to use Helios Signals for high-performance, fine-grained reactivity. Use for complex dependency graphs or when optimizing performance.
---

# Signals Animation

Helios exposes a Signal-based reactivity system (similar to SolidJS or Preact Signals) for managing state efficiently.

## Quick Start

```typescript
import { Helios, computed, effect } from '@helios-project/core';

const helios = new Helios({ duration: 10, fps: 60 });

// Access signals directly
const frame = helios.currentFrame; // ReadonlySignal<number>

// Create computed values
const rotation = computed(() => {
  return (frame.value / 60) * 360; // Rotate 360 deg per second
});

// React to changes
effect(() => {
  const div = document.getElementById('box');
  div.style.transform = `rotate(${rotation.value}deg)`;
});
```

## Key Patterns

### Derived State
Use `computed()` to create state that depends on other signals. It only re-evaluates when dependencies change.

```typescript
const progress = computed(() => helios.currentFrame.value / (helios.duration * helios.fps));
const width = computed(() => progress.value * 100 + '%');
```

### Side Effects
Use `effect()` to perform DOM updates or rendering logic. Effects run immediately and re-run whenever any signal accessed inside them changes.

### Performance
Signals are more efficient than `helios.subscribe()` for complex graphs because they update fine-grained dependencies rather than the entire state tree.

## Source
- Example: `examples/signals-animation/`
- API: `packages/core/src/signals.ts`
