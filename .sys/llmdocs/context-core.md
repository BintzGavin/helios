# Core Context

## A. Architecture

The `@helios-project/core` package is the pure TypeScript engine that drives the animation state. It follows the **Helios State Machine** pattern:

1.  **Store (`Helios` class)**: The single source of truth for the composition state (current frame, duration, fps, playback status). It uses **Signals** for reactive state management.
2.  **Drivers (`TimeDriver` interface)**: The engine uses the Strategy Pattern to synchronize external systems.
    -   `DomDriver`: Syncs HTML DOM elements (video/audio) and Web Animations API.
    -   `NoopDriver`: Runs without side effects (for testing or headless calculation).
3.  **Subscribers**: UI components or other systems subscribe to state changes.
4.  **Loop**: The engine runs a ticker (RAF or Timeout) to advance time and update the driver.

## B. File Tree

```
packages/core/src/
├── animation.ts       # Animation primitives
├── captions.ts        # Caption/SRT parsing and active cue logic
├── color.ts           # Color parsing and interpolation
├── drivers/           # TimeDriver implementations
│   ├── DomDriver.ts
│   ├── TimeDriver.ts
│   ├── WaapiDriver.ts
│   └── index.ts
├── easing.ts          # Easing functions
├── errors.ts          # Error handling
├── index.ts           # Public API entry point
├── markers.ts         # Marker management
├── random.ts          # Deterministic PRNG
├── schema.ts          # Input prop validation schema
├── sequencing.ts      # Sequence/Series helpers
├── signals.ts         # Reactive primitives
├── timecode.ts        # Timecode utilities
├── transitions.ts     # Transition helpers
└── types.ts           # Shared types
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
```

## D. Public Methods (Helios Class)

```typescript
class Helios {
  // Signals (Readonly)
  public get currentFrame(): ReadonlySignal<number>;
  public get loop(): ReadonlySignal<boolean>;
  public get isPlaying(): ReadonlySignal<boolean>;
  public get inputProps(): ReadonlySignal<Record<string, any>>;
  public get playbackRate(): ReadonlySignal<number>;
  public get volume(): ReadonlySignal<number>;
  public get muted(): ReadonlySignal<boolean>;
  public get captions(): ReadonlySignal<CaptionCue[]>;
  public get activeCaptions(): ReadonlySignal<CaptionCue[]>;
  public get markers(): ReadonlySignal<Marker[]>;
  public get playbackRange(): ReadonlySignal<[number, number] | null>;
  public get width(): ReadonlySignal<number>;
  public get height(): ReadonlySignal<number>;

  // Getters
  public get duration(): number;
  public get fps(): number;

  // Static
  static diagnose(): Promise<DiagnosticReport>;

  constructor(options: HeliosOptions);

  public getState(): Readonly<HeliosState>;
  public setSize(width: number, height: number): void;
  public setLoop(shouldLoop: boolean): void;
  public setDuration(seconds: number): void;
  public setFps(fps: number): void;
  public setInputProps(props: Record<string, any>): void;
  public setPlaybackRate(rate: number): void;
  public setAudioVolume(volume: number): void;
  public setAudioMuted(muted: boolean): void;
  public setCaptions(captions: string | CaptionCue[]): void;
  public setMarkers(markers: Marker[]): void;
  public addMarker(marker: Marker): void;
  public removeMarker(id: string): void;
  public seekToMarker(id: string): void;
  public setPlaybackRange(startFrame: number, endFrame: number): void;
  public clearPlaybackRange(): void;

  public subscribe(callback: HeliosSubscriber): () => void;
  public unsubscribe(callback: HeliosSubscriber): void;

  public registerStabilityCheck(check: StabilityCheck): () => void;

  public play(): void;
  public pause(): void;
  public seek(frame: number): void;
  public waitUntilStable(): Promise<void>;

  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;

  public dispose(): void;
}
```
