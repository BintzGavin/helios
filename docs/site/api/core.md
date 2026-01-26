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

const helios = new Helios(options: HeliosOptions);
```

**`HeliosOptions`**:
- **`duration`** (number): Duration of the composition in seconds (Required).
- **`fps`** (number): Frames per second (Required).
- **`schema`** (`HeliosSchema`, optional): Schema for validating input properties.
- **`inputProps`** (object, optional): Initial input properties.
- **`autoSyncAnimations`** (boolean, default: `false`): If true, uses `DomDriver` to sync CSS/WAAPI animations.
- **`playbackRate`** (number, default: `1`): Initial playback speed.
- **`volume`** (number, default: `1`): Initial audio volume (0.0 - 1.0).
- **`muted`** (boolean, default: `false`): Initial muted state.
- **`animationScope`** (HTMLElement, optional): Scope for the driver to control.

### Signals (State)

Helios uses signals for reactive state management. You can subscribe to these signals or access their values.

- **`currentFrame`** (`ReadonlySignal<number>`): The current frame number.
- **`isPlaying`** (`ReadonlySignal<boolean>`): Whether the animation is playing.
- **`playbackRate`** (`ReadonlySignal<number>`): Current playback speed multiplier.
- **`volume`** (`ReadonlySignal<number>`): Current audio volume.
- **`muted`** (`ReadonlySignal<boolean>`): Current muted state.
- **`inputProps`** (`ReadonlySignal<Record<string, any>>`): Current input properties.

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

#### `setPlaybackRate(rate)`
Sets the playback speed (e.g., `0.5`, `1`, `2`).

#### `setAudioVolume(volume)`
Sets the audio volume (clamped between 0.0 and 1.0) and syncs with the driver.

#### `setAudioMuted(muted)`
Sets the audio muted state and syncs with the driver.

#### `setInputProps(props)`
Updates the input properties, validating them against the schema if provided.

#### `bindToDocumentTimeline()`
Binds the Helios instance to `document.timeline`. Useful when the timeline is driven externally (e.g., by the Renderer or Studio).

#### `unbindFromDocumentTimeline()`
Stops syncing with `document.timeline`.

#### `dispose()`
Cleans up resources (tickers, subscribers, drivers) to prevent memory leaks.

### Static Methods

#### `Helios.diagnose()`
Returns a `Promise<DiagnosticReport>` containing environment support information (WAAPI, WebCodecs, etc.).

## Validation (Schema)

Helios supports runtime validation of input properties.

```typescript
import { Helios, HeliosSchema } from '@helios-project/core';

const schema: HeliosSchema = {
  text: { type: 'string', default: 'Hello' },
  color: { type: 'string', default: '#ff0000' },
  count: { type: 'number', min: 0, max: 10 }
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

## Captions (SRT)

Utilities for parsing SRT files.

- **`parseSrt(srtContent)`**: Parses SRT string into structured data.
- **`stringifySrt(captions)`**: Converts structured data back to SRT string.

## Error Handling

Helios throws `HeliosError` with specific error codes (`HeliosErrorCode`) for robust error handling.

```typescript
import { HeliosError, HeliosErrorCode } from '@helios-project/core';

try {
  // ...
} catch (e) {
  if (e instanceof HeliosError && e.code === HeliosErrorCode.INVALID_DURATION) {
    // Handle specific error
  }
}
```
