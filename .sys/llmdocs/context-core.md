# Core Context

## A. Architecture

The Core package (`@helios-project/core`) implements the **Helios State Machine**, a framework-agnostic engine for programmatic video creation. It manages the timeline, state, and synchronization of animation elements.

**Key Principles:**
- **Store**: State is held in reactive `Signal` primitives (via `signals.ts`).
- **Actions**: Public methods (e.g., `seek()`, `play()`) modify signals.
- **Subscribers**: The `subscribe()` method allows external systems (Renderer, Player) to react to state changes.
- **Drivers**: A pluggable `TimeDriver` strategy handles the actual time progression (e.g., `DomDriver` for browsers, `WaapiDriver` for Web Animations).

## B. File Tree

```
packages/core/src/
├── drivers/           # TimeDriver implementations (Dom, Waapi, Noop)
├── ai.ts              # AI prompt generation utilities
├── animation.ts       # Animation interpolation helpers
├── captions.ts        # SRT parsing and caption logic
├── color.ts           # Color manipulation and interpolation
├── easing.ts          # Easing functions
├── errors.ts          # Structured error handling
├── index.ts           # Main entry point and Helios class
├── markers.ts         # Timeline marker logic
├── random.ts          # Deterministic PRNG
├── render-session.ts  # Frame iteration logic
├── schema.ts          # Input property schema validation
├── sequencing.ts      # Stagger/sequence utilities
├── signals.ts         # Reactivity system
├── timecode.ts        # Timecode conversion utilities
└── transitions.ts     # Transition primitives
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
  audioTracks: Record<string, AudioTrackState>;
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

## D. Public Methods (Helios)

```typescript
class Helios {
  // Signals
  get currentFrame(): ReadonlySignal<number>;
  get currentTime(): ReadonlySignal<number>;
  get loop(): ReadonlySignal<boolean>;
  get isPlaying(): ReadonlySignal<boolean>;
  get inputProps(): ReadonlySignal<Record<string, any>>;
  get playbackRate(): ReadonlySignal<number>;
  get volume(): ReadonlySignal<number>;
  get muted(): ReadonlySignal<boolean>;
  get audioTracks(): ReadonlySignal<Record<string, AudioTrackState>>;
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
  constructor(options: HeliosOptions);
  dispose(): void;

  // State
  getState(): Readonly<HeliosState>;

  // Setters
  setSize(width: number, height: number): void;
  setLoop(shouldLoop: boolean): void;
  setDuration(seconds: number): void;
  setFps(fps: number): void;
  setInputProps(props: Record<string, any>): void;
  setPlaybackRate(rate: number): void;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setAudioTrackVolume(trackId: string, volume: number): void;
  setAudioTrackMuted(trackId: string, muted: boolean): void;
  setCaptions(captions: string | CaptionCue[]): void;
  setMarkers(markers: Marker[]): void;
  addMarker(marker: Marker): void;
  removeMarker(id: string): void;
  seekToMarker(id: string): void;
  seekToTime(seconds: number): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;

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

  // Timeline Binding
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```
