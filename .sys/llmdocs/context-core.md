# Core Context

## A. Architecture

**Helios State Machine**
The Core package implements a "Headless State Machine" pattern.
1.  **Store**: `Helios` class holds the state (frame, duration, playback status, inputs) in reactive `signals`.
2.  **Drivers**: A `TimeDriver` (e.g., `DomDriver`) synchronizes external systems (AudioContext, DOM elements) with the internal state.
3.  **Subscribers**: UI components or renderers subscribe to state changes to update their views.

This architecture ensures that the "truth" of the composition is purely mathematical and decoupled from the display layer, enabling:
-   Deterministic rendering (frame-by-frame)
-   Headless execution (Node.js/Workers)
-   Reactive UI updates

## B. File Tree

```
packages/core/src/
├── drivers/           # TimeDriver implementations (DomDriver, NoopDriver)
├── ai.ts              # AI helper utilities
├── animation.ts       # Animation primitives (interpolate, spring)
├── captions.ts        # Caption parsing and cue management
├── color.ts           # Color utilities (hex/rgb/hsl parsing & interpolation)
├── easing.ts          # Easing functions (linear, quad, cubic, etc.)
├── errors.ts          # Error handling (HeliosError)
├── Helios.ts          # Main Helios class and state machine
├── index.ts           # Public API exports
├── markers.ts         # Marker management
├── random.ts          # Deterministic PRNG
├── render-session.ts  # Render session orchestration
├── schema.ts          # Input prop schema validation
├── sequencing.ts      # Sequencing helpers (sequence, series)
├── signals.ts         # Reactive signal primitives
├── timecode.ts        # Timecode conversion utilities
└── transitions.ts     # Transition helpers (crossfade)
```

## C. Type Definitions

```typescript
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

export type HeliosSubscriber<TInputProps = Record<string, any>> = (state: HeliosState<TInputProps>) => void;

export interface HeliosOptions<TInputProps = Record<string, any>> {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  playbackRange?: [number, number];
  autoSyncAnimations?: boolean;
  animationScope?: unknown;
  inputProps?: TInputProps;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  audioTracks?: Record<string, AudioTrackState>;
  availableAudioTracks?: AudioTrackMetadata[];
  captions?: string | CaptionCue[];
  markers?: Marker[];
  driver?: TimeDriver;
  ticker?: Ticker;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  webgl: boolean;
  webgl2: boolean;
  webAudio: boolean;
  colorGamut: 'srgb' | 'p3' | 'rec2020' | null;
  videoCodecs: { h264: boolean; vp8: boolean; vp9: boolean; av1: boolean };
  audioCodecs: { aac: boolean; opus: boolean };
  videoDecoders: { h264: boolean; vp8: boolean; vp9: boolean; av1: boolean };
  audioDecoders: { aac: boolean; opus: boolean };
  userAgent: string;
}
```

## D. Public Methods

```typescript
// Helios Class
class Helios<TInputProps> {
  // Signals
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

  get isVirtualTimeBound(): boolean;

  // Methods
  constructor(options: HeliosOptions<TInputProps>);
  getState(): Readonly<HeliosState<TInputProps>>;
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
  setAvailableAudioTracks(tracks: AudioTrackMetadata[]): void;
  setCaptions(captions: string | CaptionCue[]): void;
  setMarkers(markers: Marker[]): void;
  addMarker(marker: Marker): void;
  removeMarker(id: string): void;
  seekToMarker(id: string): void;
  seekToTime(seconds: number): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;
  getAudioContext(): Promise<unknown>;
  getAudioSourceNode(trackId: string): Promise<unknown>;

  // Subscription
  subscribe(callback: HeliosSubscriber<TInputProps>): () => void;
  unsubscribe(callback: HeliosSubscriber<TInputProps>): void;

  // Stability
  registerStabilityCheck(check: StabilityCheck): () => void;
  waitUntilStable(): Promise<void>;

  // Playback
  play(): void;
  pause(): void;
  seek(frame: number): void;

  // Synchronization
  bindTo(master: Helios<any>): void;
  unbind(): void;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
  dispose(): void;

  // Static
  static diagnose(): Promise<DiagnosticReport>;
}
```
