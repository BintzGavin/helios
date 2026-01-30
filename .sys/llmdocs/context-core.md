# Context: Core

## A. Architecture

The Core domain implements the **Helios State Machine**, a framework-agnostic engine that manages the timeline, state (`currentFrame`, `isPlaying`, `inputProps`, etc.), and synchronization strategies.

It follows the **Store -> Actions -> Subscribers** pattern:
1.  **Store**: Internal state is managed using Signals (`packages/core/src/signals.ts`) for reactivity.
2.  **Actions**: Public methods on the `Helios` class (e.g., `seek`, `play`, `setInputProps`) modify this internal state.
3.  **Subscribers**: External consumers (Renderer, Player, Studio) subscribe to state changes via `subscribe()`.

The engine supports pluggable **TimeDrivers** (`DomDriver`, `WaapiDriver`, `NoopDriver`) to synchronize the internal frame counter with external time sources (like `requestAnimationFrame`, `HTMLMediaElement`, or `document.timeline`).

## B. File Tree

```
packages/core/src/
├── drivers/
│   ├── DomDriver.ts
│   ├── NoopDriver.ts
│   ├── TimeDriver.ts
│   └── index.ts
├── animation.ts
├── captions.ts
├── color.ts
├── easing.ts
├── errors.ts
├── index.ts
├── markers.ts
├── random.ts
├── render-session.ts
├── schema.ts
├── sequencing.ts
├── signals.ts
├── timecode.ts
└── transitions.ts
```

## C. Type Definitions

```typescript
export type HeliosState = {
  width: number;
  height: number;
  duration: number;
  fps: number;
  currentFrame: number;
  loop: boolean;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
  volume: number;
  muted: boolean;
  captions: CaptionCue[];
  activeCaptions: CaptionCue[];
  markers: Marker[];
  playbackRange: [number, number] | null;
};

export type HeliosSubscriber = (state: HeliosState) => void;

export type StabilityCheck = () => Promise<void>;

export interface HeliosOptions {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  playbackRange?: [number, number];
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  captions?: string | CaptionCue[];
  markers?: Marker[];
  driver?: TimeDriver;
  ticker?: Ticker;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}

export interface RenderSessionOptions {
  startFrame: number;
  endFrame: number;
  abortSignal?: AbortSignal;
}
```

## D. Public Methods

### `Helios` Class

```typescript
class Helios {
  // Static
  static diagnose(): Promise<DiagnosticReport>;

  constructor(options: HeliosOptions);

  // State Access
  getState(): Readonly<HeliosState>;

  // Configuration
  setSize(width: number, height: number): void;
  setLoop(shouldLoop: boolean): void;
  setDuration(seconds: number): void;
  setFps(fps: number): void;
  setInputProps(props: Record<string, any>): void;
  setPlaybackRate(rate: number): void;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setCaptions(captions: string | CaptionCue[]): void;
  setMarkers(markers: Marker[]): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;

  // Markers
  addMarker(marker: Marker): void;
  removeMarker(id: string): void;
  seekToMarker(id: string): void;

  // Subscription
  subscribe(callback: HeliosSubscriber): () => void;
  unsubscribe(callback: HeliosSubscriber): void;

  // Stability
  registerStabilityCheck(check: StabilityCheck): () => void;
  waitUntilStable(): Promise<void>;

  // Playback
  play(): void;
  pause(): void;
  seek(frame: number): void;

  // Synchronization
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;

  // Lifecycle
  dispose(): void;
}
```

### `RenderSession` Class

```typescript
class RenderSession implements AsyncIterable<number> {
  constructor(helios: Helios, options: RenderSessionOptions);
  [Symbol.asyncIterator](): AsyncIterator<number>;
}
```
