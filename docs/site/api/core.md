---
title: "Core API"
description: "API Reference for @helios-project/core"
---

# Core API

The `@helios-project/core` package provides the fundamental building blocks for Helios compositions, including the animation engine, state management, and sequencing utilities.

## Helios Class

The main class that manages the animation state, timing, and synchronization.

### Constructor

```typescript
import { Helios } from '@helios-project/core';

// TInputProps allows you to strictly type your input properties
interface MyProps {
  title: string;
  color: string;
}

const helios = new Helios<MyProps>(options: HeliosOptions<MyProps>);
```

**`HeliosOptions<TInputProps>`**:
- **`duration`** (number): Duration of the composition in seconds (Required).
- **`fps`** (number): Frames per second (Required).
- **`initialFrame`** (number, default: `0`): The frame to start at.
- **`schema`** (`HeliosSchema`, optional): Schema for validating input properties.
- **`inputProps`** (object, optional): Initial input properties.
- **`captions`** (string | CaptionCue[], optional): Initial captions (SRT/WebVTT string or cue array).
- **`autoSyncAnimations`** (boolean, default: `false`): If true, uses `DomDriver` to sync CSS/WAAPI animations.
- **`playbackRate`** (number, default: `1`): Initial playback speed.
- **`volume`** (number, default: `1`): Initial audio volume (0.0 - 1.0).
- **`muted`** (boolean, default: `false`): Initial muted state.
- **`animationScope`** (HTMLElement | unknown, optional): Scope for the driver to control. Defaults to `document`.

### Signals (State)

Helios uses signals for reactive state management. You can subscribe to these signals or access their values.

- **`currentFrame`** (`ReadonlySignal<number>`): The current frame number.
- **`isPlaying`** (`ReadonlySignal<boolean>`): Whether the animation is playing.
- **`isVirtualTimeBound`** (`boolean`): (Getter) Returns `true` if the instance is synchronously bound to `window.__HELIOS_VIRTUAL_TIME__`.
- **`playbackRate`** (`ReadonlySignal<number>`): Current playback speed multiplier.
- **`volume`** (`ReadonlySignal<number>`): Current audio volume.
- **`muted`** (`ReadonlySignal<boolean>`): Current muted state.
- **`inputProps`** (`ReadonlySignal<Record<string, any>>`): Current input properties.
- **`captions`** (`ReadonlySignal<CaptionCue[]>`): The full list of parsed captions.
- **`activeCaptions`** (`ReadonlySignal<CaptionCue[]>`): The list of captions active at the current time.
- **`activeClips`** (`ReadonlySignal<HeliosClip[]>`): The list of timeline clips active at the current time.
- **`width`** (`ReadonlySignal<number>`): The composition width.
- **`height`** (`ReadonlySignal<number>`): The composition height.
- **`availableAudioTracks`** (`ReadonlySignal<AudioTrackMetadata[]>`): List of detected audio tracks. Each object contains `id`, `startTime`, `duration`, and optional `fadeEasing`.

### Methods

#### `subscribe(listener)`
Subscribes to state updates. Returns an unsubscribe function.

```typescript
const unsubscribe = helios.subscribe((state: HeliosState) => {
  console.log(`Frame: ${state.currentFrame}, Playing: ${state.isPlaying}`);
});
```

#### `getState()`
Returns a snapshot of the current state (`HeliosState`).

#### `play()` / `pause()`
Starts or stops playback.

#### `seek(frame)`
Jumps to a specific frame index.

#### `waitUntilStable()`
Waits for the composition to stabilize. This ensures that all asynchronous operations (like image loading, font loading, and media seeking) triggered by the last seek/update are complete. Returns a `Promise<void>`. Useful for deterministic rendering.

**Note**: When using virtual time (e.g. during rendering), this method blocks until the virtual time has fully synchronized.

```typescript
await helios.seek(100);
await helios.waitUntilStable();
// Now it is safe to capture the frame
```

#### `registerStabilityCheck(check)`
Registers an asynchronous check that `waitUntilStable` must wait for. Useful for custom resources like map tiles or 3D models.

```typescript
helios.registerStabilityCheck(async () => {
  await myCustomResource.load();
});
```

#### `setPlaybackRate(rate)`
Sets the playback speed (e.g., `0.5`, `1`, `2`).

#### `setAudioVolume(volume)`
Sets the audio volume (clamped between 0.0 and 1.0) and syncs with the driver.

#### `setAudioMuted(muted)`
Sets the audio muted state and syncs with the driver.

#### `setInputProps(props)`
Updates the input properties, validating them against the schema if provided.

#### `setCaptions(captions)`
Updates the captions. Accepts an SRT/WebVTT string or an array of `CaptionCue` objects.

#### `setSize(width, height)`
Updates the composition resolution.

#### `bindTo(master: Helios)`
Binds this Helios instance to a master Helios instance. This instance will sync its state (time, playback, etc.) with the master.

#### `unbind()`
Unbinds this instance from any master (including `document.timeline` or another Helios instance).

#### `bindToDocumentTimeline()`
Binds the Helios instance to `document.timeline`. Useful for syncing with external drivers (Renderer, Studio).

#### `dispose()`
Cleans up resources (tickers, polling loops, subscribers, drivers) to prevent memory leaks.

### Static Methods

#### `Helios.diagnose()`
Returns a `Promise<DiagnosticReport>` containing environment support information (WAAPI, WebCodecs, OffscreenCanvas, User Agent).

## Composition Schema

These interfaces are used for serializable composition definitions.

### `HeliosConfig`
Base configuration for a Helios session.

```typescript
interface HeliosConfig<TInputProps = Record<string, any>> {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  playbackRange?: [number, number];
  autoSyncAnimations?: boolean;
  inputProps?: TInputProps;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  audioTracks?: Record<string, AudioTrackState>;
  availableAudioTracks?: AudioTrackMetadata[];
  captions?: string | CaptionCue[];
  markers?: Marker[];
  timeline?: HeliosTimeline;
}
```

### `HeliosComposition`
Extends `HeliosConfig` to include timeline definitions.

```typescript
interface HeliosComposition<TInputProps = Record<string, any>> extends HeliosConfig<TInputProps> {
  timeline?: HeliosTimeline;
}
```

## DomDriver Attributes

When using `DomDriver` (default), you can control behavior using data attributes on DOM elements.

### Audio & Video Control
- **`data-helios-track-id="my-track"`**: Assigns an ID to an audio/video element. Used for grouping volume/mute controls.
- **`data-helios-fade-in="duration"`**: Linearly fades in the audio volume over `duration` seconds at the start of the media.
- **`data-helios-fade-out="duration"`**: Linearly fades out the audio volume over `duration` seconds before the end of the media.
- **`data-helios-fade-easing="easing"`**: Sets the easing function for fades (e.g., "linear", "quad.in", "cubic.out").
- **`data-helios-offset="seconds"`**: Delays the media playback by `seconds`.
- **`data-helios-seek="seconds"`**: Starts playback from `seconds` into the media file (clips the beginning).
- **`loop`**: The standard HTML `loop` attribute is fully supported and synchronized with the Helios timeline (wrapping time calculations).

## Validation (Schema)

Helios supports runtime validation of input properties.

```typescript
import { Helios, HeliosSchema } from '@helios-project/core';

const schema: HeliosSchema = {
  text: { type: 'string', default: 'Hello' },
  color: { type: 'string', default: '#ff0000' },
  count: { type: 'number', min: 0, max: 10 },
  theme: { type: 'string', enum: ['light', 'dark'] }
};

const helios = new Helios({ duration: 5, fps: 30, schema });
```

## Signals API

Primitive for reactive state.

- **`signal(initialValue)`**: Creates a writable signal.
- **`computed(fn)`**: Creates a read-only signal derived from others.
- **`effect(fn)`**: Runs a side effect when dependencies change.

## Animation Helpers

### `sequence(animations)`
Calculates start times for a sequence of durations.

### `series(items)`
Helper for sequential layout of elements.

### `spring(options)`
Physics-based spring animation helper.

### `interpolate(value, inputRange, outputRange, options)`
Interpolates values (linear or with easing).

### `random(seed)`
Deterministic random number generator based on Mulberry32.

### `interpolateColors(value, inputRange, outputRange)`
Interpolates between colors (Hex, RGB, HSL).

### `stagger(items, interval, startFrame)`
Staggers a list of items by a fixed interval.

```typescript
const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
const staggered = stagger(items, 10);
// [{ id: 1, from: 0 }, { id: 2, from: 10 }, { id: 3, from: 20 }]
```

### `shift(items, offset)`
Shifts the start time of a list of sequenced items.

```typescript
const shifted = shift(staggered, 30);
// Shifts all items by 30 frames
```

## AI Utilities

### `createSystemPrompt(helios)`
Generates a context-aware system prompt for AI agents, including the current composition state (duration, FPS, resolution) and prop schema.

```typescript
import { createSystemPrompt } from '@helios-project/core';

const prompt = createSystemPrompt(helios);
```

### `HELIOS_BASE_PROMPT`
The base system prompt text used by `createSystemPrompt`.

## Captions

Utilities for parsing caption files.

- **`parseCaptions(content)`**: Auto-detects format (SRT or WebVTT) and parses it into structured data.
- **`parseSrt(srtContent)`**: Parses SRT string into structured data.
- **`parseWebVTT(vttContent)`**: Parses WebVTT string into structured data.
- **`stringifySrt(captions)`**: Converts structured data back to SRT string.
