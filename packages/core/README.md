# @helios-project/core

The headless logic engine for Helios. This package provides the core state management, timing, and animation primitives for programmatic video creation. It is framework-agnostic and runs in both the browser and Node.js.

## Features

- **Headless State Machine**: Manages frame, playback state, and input properties via reactive Signals.
- **Time Driver**: Abstracted time control supporting `requestAnimationFrame` (Browser), `setImmediate` (Node), and Web Animations API (WAAPI).
- **Sequencing**: Helpers for relative timing (`sequence`) and sequential layout (`series`).
- **Animation Helpers**: Functions for `interpolate` (with easing) and `spring` physics.
- **Diagnostics**: Environment capability detection (`diagnose`).

## Installation

This package is intended for use within the Helios monorepo.

```bash
npm install @helios-project/core
```

## Usage

### Basic Setup

```typescript
import { Helios } from '@helios-project/core';

const helios = new Helios({
  fps: 30,
  duration: 10, // seconds
  autoSyncAnimations: true // Sync with document.timeline
});

// Subscribe to frame updates
helios.currentFrame.subscribe((frame) => {
  console.log(`Current Frame: ${frame}`);
});

// Start playback
helios.play();
```

### Signals

Helios uses a lightweight Signals implementation for reactive state.

```typescript
// Access values directly
console.log(helios.isPlaying.peek()); // false

// Subscribe to changes
const unsubscribe = helios.isPlaying.subscribe((playing) => {
  console.log(playing ? 'Playing' : 'Paused');
});

// Set input properties (reactive)
helios.setInputProps({ text: 'Hello World' });
```

### Sequencing

Coordinate animations relative to a parent time or in a sequence.

```typescript
import { sequence, series } from '@helios-project/core';

// Calculate local time for an item starting at frame 0 with duration 30
const { localFrame, progress, isActive } = sequence({
  frame: currentFrame,
  from: 0,
  durationInFrames: 30
});

if (isActive) {
  // Render item using localFrame (0-29)
}

// Layout items in a series (one after another)
const items = [
  { id: 'intro', durationInFrames: 60 },
  { id: 'body', durationInFrames: 120 },
  { id: 'outro', durationInFrames: 60 }
];

const sequencedItems = series(items);
// sequencedItems[0].from = 0
// sequencedItems[1].from = 60
// sequencedItems[2].from = 180
```

### Animation Helpers

Interpolate values and use physics-based springs.

```typescript
import { interpolate, spring, Easing } from '@helios-project/core';

// Linear interpolation with easing
const opacity = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.quadOut,
  extrapolateRight: 'clamp'
});

// Spring physics
const x = spring({
  frame: frame,
  fps: 30,
  from: 0,
  to: 100,
  config: { stiffness: 100, damping: 10 }
});
```

### Diagnostics

Check environment capabilities.

```typescript
import { Helios } from '@helios-project/core';

Helios.diagnose().then((report) => {
  console.log('WebCodecs:', report.webCodecs);
  console.log('WAAPI:', report.waapi);
});
```

## License

MIT
