# CORE Context

## A. Architecture

The **CORE** domain implements the **Helios State Machine** pattern.

1.  **Store**: The `Helios` class maintains the single source of truth for the animation state (`currentFrame`, `isPlaying`, `inputProps`, etc.) using **Signals** (`packages/core/src/signals.ts`).
2.  **Actions**: Public methods on the `Helios` class (e.g., `seek()`, `play()`, `setDuration()`) modify these signals.
3.  **Subscribers**: The state changes propagate to:
    *   **Drivers**: The active `TimeDriver` (e.g., `DomDriver`) receives updates via its `update()` method to synchronize the external environment (DOM, WAAPI, Audio).
    *   **External Consumers**: UI components or renderers subscribe via `helios.subscribe()`.

The `DomDriver` acts as the bridge between the pure mathematical state of Helios and the browser's DOM, handling:
*   WAAPI Animation synchronization.
*   HTMLMediaElement (`<video>`, `<audio>`) synchronization.
*   Audio volume, fading, looping, and mute states.

## B. File Tree

```
packages/core/src/
├── Helios.ts
├── ai.ts
├── animation.ts
├── captions.ts
├── color.ts
├── drivers/
│   ├── DomDriver-metadata.test.ts
│   ├── DomDriver.test.ts
│   ├── DomDriver.ts
│   ├── DomDriverDiscovery.test.ts
│   ├── ManualTicker.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── Ticker.ts
│   ├── TimeDriver.ts
│   ├── TimeoutTicker.ts
│   └── index.ts
├── easing.ts
├── errors.ts
├── index.ts
├── markers.ts
├── random.ts
├── render-session.ts
├── schema.ts
├── sequencing.ts
├── signals.ts
├── subscription-timing.test.ts
├── time-control.ts
├── timecode.ts
└── transitions.ts
```

## C. Type Definitions

```typescript
// From Helios.ts

export type HeliosState<TInputProps = Record<string, any>> = {
  width: number;
  height: number;
  duration: number;
  fps: number;
  currentFrame: number;
  loop: boolean;
  isPlaying: boolean;
  inputProps: TInputProps;
  playbackRate: number;
  volume: number;
  muted: boolean;
  audioTracks: Record<string, AudioTrackState>;
  availableAudioTracks: AudioTrackMetadata[];
  captions: CaptionCue[];
  activeCaptions: CaptionCue[];
  markers: Marker[];
  playbackRange: [number, number] | null;
  currentTime: number;
};

export type AudioTrackState = {
  volume: number;
  muted: boolean;
};

export interface AudioTrackMetadata {
  id: string;
  startTime: number;
  duration: number;
}

export type HeliosSubscriber<TInputProps = Record<string, any>> = (state: HeliosState<TInputProps>) => void;

export type StabilityCheck = () => Promise<void>;

export interface HeliosOptions<TInputProps = Record<string, any>> {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  playbackRange?: [number, number];
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: TInputProps;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  captions?: string | CaptionCue[];
  markers?: Marker[];
  driver?: TimeDriver;
  ticker?: Ticker;
}

export interface Marker {
  id: string;
  time: number; // in seconds
  label?: string;
  color?: string; // hex code
  metadata?: Record<string, any>;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
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

## D. Public Methods

```typescript
// Helios Class
class Helios<TInputProps = Record<string, any>> {
  // Readonly Signals
  get currentFrame(): ReadonlySignal<number>;
  get currentTime(): ReadonlySignal<number>;
  get loop(): ReadonlySignal<boolean>;
  get isPlaying(): ReadonlySignal<boolean>;
  get inputProps(): ReadonlySignal<TInputProps>;
  get playbackRate(): ReadonlySignal<number>;
  get volume(): ReadonlySignal<number>;
  get muted(): ReadonlySignal<boolean>;
  get audioTracks(): ReadonlySignal<Record<string, AudioTrackState>>;
  get availableAudioTracks(): ReadonlySignal<AudioTrackMetadata[]>;
  get captions(): ReadonlySignal<CaptionCue[]>;
  get activeCaptions(): ReadonlySignal<CaptionCue[]>;
  get markers(): ReadonlySignal<Marker[]>;
  get playbackRange(): ReadonlySignal<[number, number] | null>;
  get width(): ReadonlySignal<number>;
  get height(): ReadonlySignal<number>;
  get duration(): ReadonlySignal<number>;
  get fps(): ReadonlySignal<number>;

  // Static
  static diagnose(): Promise<DiagnosticReport>;

  // Lifecycle
  constructor(options: HeliosOptions<TInputProps>);
  dispose(): void;

  // State Access
  getState(): Readonly<HeliosState<TInputProps>>;

  // Configuration
  setSize(width: number, height: number): void;
  setLoop(shouldLoop: boolean): void;
  setDuration(seconds: number): void;
  setFps(fps: number): void;
  setInputProps(props: TInputProps): void;
  setPlaybackRate(rate: number): void;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setAudioTrackVolume(trackId: string, volume: number): void;
  setAudioTrackMuted(trackId: string, muted: boolean): void;
  setCaptions(captions: string | CaptionCue[]): void;
  setMarkers(markers: Marker[]): void;
  addMarker(marker: Marker): void;
  removeMarker(id: string): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;

  // Subscription
  subscribe(callback: HeliosSubscriber<TInputProps>): () => void;
  unsubscribe(callback: HeliosSubscriber<TInputProps>): void;
  registerStabilityCheck(check: StabilityCheck): () => void;

  // Playback Control
  play(): void;
  pause(): void;
  seek(frame: number): void;
  seekToTime(seconds: number): void;
  seekToMarker(id: string): void;
  waitUntilStable(): Promise<void>;

  // Synchronization
  bindTo(master: Helios<any>): void;
  unbind(): void;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```
