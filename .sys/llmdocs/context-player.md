# PLAYER Domain Context

## A. Component Structure
- **Tag**: `<helios-player>`
- **Shadow DOM**:
  - `.poster-container`: Displays poster image and "Big Play Button".
  - `iframe`: Hosts the composition (sandbox: `allow-scripts allow-same-origin`).
  - `.click-layer`: Captures clicks for play/pause (z-index: 1).
  - `.controls`: UI overlay (z-index: 2).
  - `.status-overlay`: Visual feedback for loading/error states.
  - `.captions-container`: Displays burn-in captions.

## B. Events
- `play`: Playback started.
- `pause`: Playback paused.
- `ended`: Playback completed.
- `timeupdate`: Current frame changed.
- `volumechange`: Volume or mute state changed.
- `ratechange`: Playback rate changed.
- `durationchange`: Duration changed.
- `loadstart`: Loading started.
- `loadedmetadata`: Metadata (duration, dims) available.
- `loadeddata`: Frame data available.
- `canplay`: Ready to resume.
- `canplaythrough`: Ready to play without buffering.
- `seeking`: Seek operation started.
- `seeked`: Seek operation completed.
- `error`: Error occurred (detail contains error info).

## C. Attributes
- `src` (string): Composition URL.
- `width` (number): Player width.
- `height` (number): Player height.
- `autoplay` (boolean): Auto-start.
- `loop` (boolean): Loop playback.
- `controls` (boolean): Show UI.
- `muted` (boolean): Mute audio.
- `poster` (string): Poster image URL.
- `preload` (string): 'auto' | 'none'.
- `interactive` (boolean): Enable direct interaction.
- `input-props` (json): Dynamic properties.
- `export-mode` (string): 'auto' | 'canvas' | 'dom'.
- `export-format` (string): 'mp4' | 'webm'.
- `canvas-selector` (string): CSS selector for canvas export.

## D. Public API (HeliosPlayer)
```typescript
interface HeliosPlayer extends HTMLElement {
  // Methods
  play(): Promise<void>;
  pause(): void;
  load(): void;

  // Properties
  currentTime: number; // Get/Set (seconds)
  currentFrame: number; // Get/Set (frames)
  volume: number; // Get/Set (0-1)
  muted: boolean; // Get/Set
  playbackRate: number; // Get/Set
  inputProps: Record<string, any>; // Get/Set

  // Read-Only
  readonly duration: number;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly fps: number;
  readonly videoWidth: number;
  readonly videoHeight: number;
  readonly readyState: number;
  readonly networkState: number;
  readonly buffered: TimeRanges;
  readonly seekable: TimeRanges;
  readonly played: TimeRanges;
  readonly seeking: boolean;
}
```
