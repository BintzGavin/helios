---
name: helios-core
description: Core API for Helios video engine. Use when creating compositions, managing timeline state, controlling playback, or subscribing to frame updates. Covers Helios class instantiation, signals, animation helpers, and DOM synchronization.
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
  inputProps: { text: "Hello World" }
});

// Subscribe to state changes
const unsubscribe = helios.subscribe((state) => {
  console.log(`Frame: ${state.currentFrame}, Props:`, state.inputProps);
});

// Control playback
helios.play();
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
  loop?: boolean;                // Loop playback (default: false)
  autoSyncAnimations?: boolean;  // Auto-sync DOM animations (WAAPI) to timeline
  animationScope?: HTMLElement;  // Scope for animation syncing
  inputProps?: Record<string, any>; // Initial input properties
  schema?: HeliosSchema;         // JSON schema for inputProps validation
  playbackRate?: number;         // Initial playback rate (default: 1)
  volume?: number;               // Initial volume (0.0 to 1.0)
  muted?: boolean;               // Initial muted state
  audioTracks?: Record<string, AudioTrackState>; // Initial track state
  availableAudioTracks?: AudioTrackMetadata[];   // Headless track metadata
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
  currentTime: number;
  loop: boolean;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
  volume: number;
  muted: boolean;
  audioTracks: Record<string, AudioTrackState>;
  availableAudioTracks: AudioTrackMetadata[];
  captions: CaptionCue[];
  activeCaptions: CaptionCue[];
  markers: Marker[];
  playbackRange: [number, number] | null;
}

type AudioTrackState = {
  volume: number;
  muted: boolean;
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

// Track-specific control
// Use data-helios-track-id="myTrack" on DOM elements to group them
helios.setAudioTrackVolume(trackId: string, volume: number)
helios.setAudioTrackMuted(trackId: string, muted: boolean)

// Advanced: Audio Visualization Hooks
// Get the shared AudioContext (if supported by driver)
await helios.getAudioContext();
// Get a MediaElementAudioSourceNode for a specific track
await helios.getAudioSourceNode(trackId);

// Audio Fades:
// Use data-helios-fade-easing="quad.in" (or linear, cubic, sine, etc.)
// on DOM elements to control fade curve.
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
  metadata?: Record<string, any>;
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
// Start polling document.timeline (or __HELIOS_VIRTUAL_TIME__ in Renderer)
helios.bindToDocumentTimeline()
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
  webgl: boolean;
  webgl2: boolean;
  webAudio: boolean;
  colorGamut: 'srgb' | 'p3' | 'rec2020' | null;
  videoCodecs: {
    h264: boolean;
    vp8: boolean;
    vp9: boolean;
    av1: boolean;
  };
  audioCodecs: {
    aac: boolean;
    opus: boolean;
  };
  videoDecoders: {
    h264: boolean;
    vp8: boolean;
    vp9: boolean;
    av1: boolean;
  };
  audioDecoders: {
    aac: boolean;
    opus: boolean;
  };
  userAgent: string;
}
```

#### AI Context
Generate a system prompt for AI agents that includes the current composition context.

```typescript
import { createSystemPrompt, HELIOS_BASE_PROMPT } from '@helios-project/core';

const prompt = createSystemPrompt(helios);
// Returns a string containing:
// 1. HELIOS_BASE_PROMPT (Philosophy, API summary)
// 2. Composition State (Duration, FPS, Resolution)
// 3. Schema Definitions
```

#### Advanced Utilities

**RenderSession**
Controlled frame iteration, typically used for custom rendering or processing loops.

```typescript
import { RenderSession } from '@helios-project/core';

const session = new RenderSession(helios, {
  startFrame: 0,
  endFrame: 100,
  abortSignal: controller.signal // Optional cancellation
});

for await (const frame of session) {
  // Helios is now sought to 'frame' and is stable
  console.log(`Processing frame ${frame}`);
}
```

## Signals

The `Helios` class exposes reactive signals for granular state management. You can also create your own signals.

```typescript
import { signal, computed, effect, ReadonlySignal } from '@helios-project/core';

// 1. Create a signal
const count = signal(0);

// 2. Create a computed value (updates automatically when deps change)
const double = computed(() => count.value * 2);

// 3. React to changes
effect(() => {
  console.log(`Count: ${count.value}, Double: ${double.value}`);
});

// Update signal
count.value = 1; // Logs: "Count: 1, Double: 2"
```

### Public Helios Signals
All Helios state properties are available as read-only signals on the instance:

```typescript
helios.currentFrame: ReadonlySignal<number>
helios.isPlaying: ReadonlySignal<boolean>
helios.inputProps: ReadonlySignal<Record<string, any>>
helios.playbackRate: ReadonlySignal<number>
helios.volume: ReadonlySignal<number>
helios.muted: ReadonlySignal<boolean>
helios.audioTracks: ReadonlySignal<Record<string, AudioTrackState>>
helios.availableAudioTracks: ReadonlySignal<AudioTrackMetadata[]>
helios.captions: ReadonlySignal<CaptionCue[]>
helios.activeCaptions: ReadonlySignal<CaptionCue[]>
helios.markers: ReadonlySignal<Marker[]>
helios.currentTime: ReadonlySignal<number>
helios.playbackRange: ReadonlySignal<[number, number] | null>
helios.width: ReadonlySignal<number>
helios.height: ReadonlySignal<number>
helios.loop: ReadonlySignal<boolean>
```

## Animation Helpers

### Spring Physics
Simulate a damped harmonic oscillator.

```typescript
import { spring, calculateSpringDuration } from '@helios-project/core';

const val = spring({
  frame: currentFrame,
  fps: 30,
  from: 0,
  to: 100,
  config: { stiffness: 100, damping: 10, mass: 1 }
});

// Calculate how long (in frames) the spring takes to settle
const duration = calculateSpringDuration({
  fps: 30,
  from: 0,
  to: 100,
  config: { stiffness: 100, damping: 10 }
});
```

### Series (Sequencing)
Arrange multiple items in a timeline sequence.

```typescript
import { series } from '@helios-project/core';

const items = [
  { id: 'a', durationInFrames: 30 },
  { id: 'b', durationInFrames: 60, offset: -10 } // Overlap by 10 frames
];

const sequenced = series(items, 0);
// Result:
// [
//   { id: 'a', durationInFrames: 30, from: 0 },
//   { id: 'b', durationInFrames: 60, offset: -10, from: 20 } // 0 + 30 - 10
// ]
```

### Stagger
Stagger the start time of a list of items by a fixed interval.

```typescript
import { stagger } from '@helios-project/core';

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const staggered = stagger(items, 5);
// Result:
// [
//   { id: 'a', from: 0 },
//   { id: 'b', from: 5 },
//   { id: 'c', from: 10 }
// ]
```

### Shift
Shift the start time of a list of sequenced items.

```typescript
import { shift } from '@helios-project/core';

const items = [{ from: 0 }, { from: 10 }];
const shifted = shift(items, 30);
// Result:
// [
//   { from: 30 },
//   { from: 40 }
// ]
```

### Interpolation
Map values from one range to another.

```typescript
import { interpolate } from '@helios-project/core';

const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: 'clamp'
});
```

## Schema Validation

Define input types for validation and UI generation in Studio. Supported types now include `model`, `json`, and `shader`.

```typescript
const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    logo: { type: 'image' },
    video: { type: 'video' },
    audio: { type: 'audio' },
    font: { type: 'font' },
    model: { type: 'model' },    // 3D Model URL (.glb, .gltf)
    config: { type: 'json' },    // JSON Data URL
    effect: { type: 'shader' },  // Shader URL (.glsl)
    // Typed Arrays (float32array, uint8array, etc.)
    data: { type: 'float32array' },
    count: { type: 'number', minimum: 0, step: 1 },
    email: { type: 'string', pattern: '^\\S+@\\S+\\.\\S+$' },
    avatar: { type: 'image', accept: '.png,.jpg' },
    settings: {
        type: 'object',
        group: 'Advanced Settings', // Collapsible group in Studio
        properties: { /* ... */ }
    }
  }
};
```

## Source Files

- Main class: `packages/core/src/index.ts`
- Signals: `packages/core/src/signals.ts`
- Animation: `packages/core/src/animation.ts`
- Sequencing: `packages/core/src/sequencing.ts`
- Validation: `packages/core/src/schema.ts`
