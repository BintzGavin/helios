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
  autoSyncAnimations?: boolean;  // Auto-sync DOM animations (WAAPI) to timeline
  animationScope?: HTMLElement;  // Scope for animation syncing
  inputProps?: Record<string, any>; // Initial input properties
  playbackRate?: number;         // Initial playback rate (default: 1)
  volume?: number;               // Initial volume (0.0 to 1.0)
  muted?: boolean;               // Initial muted state
  driver?: TimeDriver;           // Custom time driver (mostly internal use)
}
```

### State

```typescript
helios.getState(): Readonly<HeliosState>

interface HeliosState {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
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
```

#### Audio Control
```typescript
helios.setAudioVolume(volume: number) // Set volume (0.0 to 1.0)
helios.setAudioMuted(muted: boolean)  // Set muted state
```

#### Data Input
```typescript
helios.setInputProps(props: Record<string, any>) // Update input properties (triggers subscribers)
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

### DOM Animation Sync

Automatically sync CSS/WAAPI animations to Helios timeline.

```typescript
const helios = new Helios({
  duration: 10,
  fps: 30,
  autoSyncAnimations: true,
  animationScope: document.querySelector('#scene')
});

// CSS animations inside #scene will now sync to helios.seek()
helios.seek(150);
```

## Source Files

- Main class: `packages/core/src/index.ts`
- Signals: `packages/core/src/signals.ts`
