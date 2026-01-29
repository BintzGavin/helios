---
name: helios-core
description: Core API for Helios video engine. Use when creating compositions, managing timeline state, controlling playback, or subscribing to frame updates. Covers Helios class instantiation, play/pause/seek controls, state subscription, and DOM animation synchronization.
---

# Helios Core API

The `Helios` class is the headless logic engine for video compositions. It manages timeline state, provides frame-accurate control, and drives animations.

## Quick Start

```typescript
import { Helios } from '@helios-project/core';

// Create instance
const helios = new Helios({
  duration: 10,  // seconds
  fps: 30,
  width: 1920,
  height: 1080,
  playbackRate: 1,
  inputProps: { text: "Hello World" }
});

// Subscribe to state changes
const unsubscribe = helios.subscribe((state) => {
  console.log(`Frame: ${state.currentFrame}, Props:`, state.inputProps);
});

// Control playback
helios.play();
helios.pause();
helios.seek(150);  // Jump to frame 150
helios.setPlaybackRate(2); // 2x speed
```

## API Reference

### Constructor

```typescript
new Helios(options: HeliosOptions)

interface HeliosOptions {
  duration: number;              // Duration in seconds (must be >= 0)
  fps: number;                   // Frames per second (must be > 0)
  width?: number;                // Canvas width (default: 1920)
  height?: number;               // Canvas height (default: 1080)
  initialFrame?: number;         // Start frame (default: 0)
  autoSyncAnimations?: boolean;  // Auto-sync DOM animations (WAAPI) to timeline
  animationScope?: HTMLElement;  // Scope for animation syncing
  inputProps?: Record<string, any>; // Initial input properties
  schema?: HeliosSchema;         // JSON schema for inputProps validation
  playbackRate?: number;         // Initial playback rate (default: 1)
  volume?: number;               // Initial volume (0.0 to 1.0)
  muted?: boolean;               // Initial muted state
  captions?: string | CaptionCue[]; // SRT string or cue array
  markers?: Marker[];            // Initial timeline markers
  playbackRange?: [number, number]; // Restrict playback to [startFrame, endFrame]
  driver?: TimeDriver;           // Custom time driver (mostly internal use)
}
```

### State

```typescript
helios.getState(): Readonly<HeliosState>

interface HeliosState {
  width: number;
  height: number;
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
  volume: number;
  muted: boolean;
  captions: CaptionCue[];
  activeCaptions: CaptionCue[];
  markers: Marker[];
  playbackRange: [number, number] | null;
}
```

### Methods

#### Playback Control
```typescript
helios.play()                 // Start playback
helios.pause()                // Pause playback
helios.seek(frame: number)    // Jump to specific frame
helios.setPlaybackRate(rate: number) // Change playback speed (e.g., 0.5, 2.0)

// Set Playback Range (Loop/Play only within these frames)
helios.setPlaybackRange(startFrame: number, endFrame: number)
helios.clearPlaybackRange()
```

#### Timeline Configuration
```typescript
helios.setDuration(seconds: number) // Update total duration
helios.setFps(fps: number)          // Update frame rate (preserves current playback time)
helios.setLoop(shouldLoop: boolean) // Toggle looping
```

#### Resolution Control
```typescript
helios.setSize(width: number, height: number) // Update canvas dimensions
```

#### Audio Control
```typescript
helios.setAudioVolume(volume: number) // Set volume (0.0 to 1.0)
helios.setAudioMuted(muted: boolean)  // Set muted state
```

#### Data Input & Validation
```typescript
// Update input properties (triggers subscribers)
// Validates against schema if one was provided in constructor
helios.setInputProps(props: Record<string, any>)
```

#### Captions
```typescript
// Set captions using SRT string or CaptionCue array
helios.setCaptions(captions: string | CaptionCue[])
```

#### Markers
Manage timeline markers for key events.

```typescript
interface Marker {
  id: string;
  time: number; // Time in seconds
  label?: string;
  color?: string;
}

helios.setMarkers(markers: Marker[])
helios.addMarker(marker: Marker)
helios.removeMarker(id: string)
helios.seekToMarker(id: string)
```

#### Subscription
```typescript
type HeliosSubscriber = (state: HeliosState) => void;

// Callback fires immediately with current state, then on every change
const unsubscribe = helios.subscribe((state: HeliosState) => {
  // Render frame based on state
});

// Cleanup
unsubscribe();
```

#### Timeline Binding
Bind Helios to `document.timeline` when the timeline is driven externally (e.g., by the Renderer or Studio).

```typescript
helios.bindToDocumentTimeline()    // Start polling document.timeline
helios.unbindFromDocumentTimeline() // Stop polling
```

#### Stability Registry
Register asynchronous checks that the Renderer must await before capturing frames (e.g., loading fonts, models, or data).

```typescript
// Register a promise that resolves when ready
helios.registerStabilityCheck(
  fetch('/data.json').then(r => r.json()).then(data => {
    // Process data...
  })
);

// Renderer calls this internally to ensure readiness
await helios.waitUntilStable();
```

#### Diagnostics
Check browser capabilities for rendering.

```typescript
const report = await Helios.diagnose();

interface DiagnosticReport {
  waapi: boolean;         // Web Animations API support
  webCodecs: boolean;     // VideoEncoder support
  offscreenCanvas: boolean;
  userAgent: string;
}
```

## Signals (Advanced)

The `Helios` class exposes reactive signals for granular state management.

```typescript
// Read-only signals
helios.currentFrame: ReadonlySignal<number>
helios.isPlaying: ReadonlySignal<boolean>
helios.inputProps: ReadonlySignal<Record<string, any>>
helios.playbackRate: ReadonlySignal<number>
helios.volume: ReadonlySignal<number>
helios.muted: ReadonlySignal<boolean>
helios.captions: ReadonlySignal<CaptionCue[]>
helios.activeCaptions: ReadonlySignal<CaptionCue[]>
helios.markers: ReadonlySignal<Marker[]>
helios.playbackRange: ReadonlySignal<[number, number] | null>
helios.width: ReadonlySignal<number>
helios.height: ReadonlySignal<number>
```

## Utilities

### Color Interpolation
Interpolate between two colors (Hex, RGB, HSL).

```typescript
import { interpolateColors } from '@helios-project/core';

const color = interpolateColors('#ff0000', '#0000ff', 0.5); // Returns rgba(...)
```

### Deterministic Randomness
Generate reproducible random numbers based on a seed.

```typescript
import { random } from '@helios-project/core';

const rng = random("my-seed");
const val = rng.next(); // Always the same sequence for "my-seed"
const num = rng.range(10, 20); // Random number between 10 and 20
```

## Common Patterns

### Frame-Based Rendering

```typescript
const helios = new Helios({ duration: 5, fps: 60 });

helios.subscribe(({ currentFrame, duration, fps }) => {
  const timeInSeconds = currentFrame / fps;
  const progress = timeInSeconds / duration; // 0 to 1
  
  // Update your visualization
  renderScene(progress);
});
```

### Schema Validation

Ensure input properties match expected types.

```typescript
const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    count: { type: 'number', minimum: 0 }
  },
  required: ['title']
};

const helios = new Helios({
  duration: 10,
  fps: 30,
  schema: schema,
  inputProps: { title: "Intro", count: 5 } // Valid
});

// Will throw error if invalid
helios.setInputProps({ title: "Intro", count: -1 });
```

## Source Files

- Main class: `packages/core/src/index.ts`
- Signals: `packages/core/src/signals.ts`
- Utilities: `packages/core/src/color.ts`, `packages/core/src/random.ts`
