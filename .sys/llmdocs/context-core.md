# Context: CORE

## A. Architecture

**Helios State Machine**
- Central class: `Helios`
- State Management: Uses reactive `signals` (Observer pattern) for all internal state (e.g., `currentFrame`, `isPlaying`).
- Public API: Exposes `ReadonlySignal` getters for reactive consumption.
- Subscription: `subscribe(callback)` allows listening to state changes.
- Timing: Controlled by `Ticker` (RAF or Timeout) and `TimeDriver` (syncs with external world).

**TimeDrivers**
- `TimeDriver` interface abstracts the synchronization target.
- `DomDriver`: Default driver. Syncs Web Animations API (`document.timeline`) and `HTMLMediaElement`s (Audio/Video).
  - Supports recursive Shadow DOM discovery for `getAnimations` and media elements.
  - Handles `data-helios-offset` and `data-helios-seek` attributes on media elements.
- `NoopDriver`: Used when no synchronization is needed.

**Stability**
- `waitUntilStable()`: Promise that resolves when the scene is ready for rendering (fonts loaded, images decoded, media seeked).
- `registerStabilityCheck()`: Allows external systems to register async checks.

## B. File Tree

```
packages/core/src/
├── animation.ts       # Animation helpers (interpolate, spring)
├── captions.ts        # SRT parsing and caption logic
├── color.ts           # Color interpolation and parsing
├── drivers/
│   ├── DomDriver.ts   # Syncs WAAPI and Media Elements (supports Shadow DOM)
│   ├── TimeDriver.ts  # Interface definition
│   ├── WaapiDriver.ts # Deprecated (merged into DomDriver)
│   └── index.ts
├── easing.ts          # Easing functions
├── errors.ts          # HeliosError definition
├── index.ts           # Main entry point, Helios class
├── markers.ts         # Marker validation and types
├── node-runtime.ts    # Node.js specific runtime helpers
├── random.ts          # Deterministic PRNG
├── render-session.ts  # RenderSession class
├── schema.ts          # Input prop validation schema
├── sequencing.ts      # Sequence and series helpers
├── signals.ts         # Reactive signal implementation
├── timecode.ts        # Timecode utilities
├── transitions.ts     # Transition helpers
└── types.ts           # (If exists, else types are in index/respective files)
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
  duration: number;
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
```

## D. Public Methods (Helios)

```typescript
class Helios {
  // Readonly Signals
  get currentFrame(): ReadonlySignal<number>;
  get loop(): ReadonlySignal<boolean>;
  get isPlaying(): ReadonlySignal<boolean>;
  get inputProps(): ReadonlySignal<Record<string, any>>;
  get playbackRate(): ReadonlySignal<number>;
  get volume(): ReadonlySignal<number>;
  get muted(): ReadonlySignal<boolean>;
  get captions(): ReadonlySignal<CaptionCue[]>;
  get activeCaptions(): ReadonlySignal<CaptionCue[]>;
  get markers(): ReadonlySignal<Marker[]>;
  get playbackRange(): ReadonlySignal<[number, number] | null>;
  get width(): ReadonlySignal<number>;
  get height(): ReadonlySignal<number>;
  get duration(): number;
  get fps(): number;

  static diagnose(): Promise<DiagnosticReport>;

  constructor(options: HeliosOptions);

  getState(): Readonly<HeliosState>;
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
  addMarker(marker: Marker): void;
  removeMarker(id: string): void;
  seekToMarker(id: string): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;

  subscribe(callback: HeliosSubscriber): () => void;
  unsubscribe(callback: HeliosSubscriber): void;

  registerStabilityCheck(check: StabilityCheck): () => void;

  play(): void;
  pause(): void;
  seek(frame: number): void;
  waitUntilStable(): Promise<void>;

  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
  dispose(): void;
}
```
