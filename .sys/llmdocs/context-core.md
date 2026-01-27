# CORE Domain Context

## A. Architecture

The **Helios State Machine** follows a "Store -> Actions -> Subscribers" pattern:

- **Store**: The `Helios` class maintains internal reactive state using signals (e.g., `_currentFrame`, `_isPlaying`, `_inputProps`). This ensures thread-safe and consistent state updates.
- **Actions**: Public methods (e.g., `seek`, `play`, `setInputProps`) modify these signals and coordinate side effects. This often involves invoking the configured `TimeDriver` to synchronize external systems (like DOM elements or WAAPI animations).
- **Subscribers**: External components (like the Studio UI or Renderer) subscribe to state changes via `subscribe(callback)`. This creates a reactive loop where UI updates reflect the underlying engine state.

## B. File Tree

```
packages/core/src/
├── animation.ts
├── animation.test.ts
├── audio.test.ts
├── captions.ts
├── captions.test.ts
├── color.ts
├── color.test.ts
├── drivers/
│   ├── DomDriver.ts
│   ├── DomDriver.test.ts
│   ├── ManualTicker.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── Ticker.ts
│   ├── TimeDriver.ts
│   ├── TimeoutTicker.ts
│   └── WaapiDriver.ts
├── easing.ts
├── easing.test.ts
├── errors.ts
├── index.ts
├── index.test.ts
├── index-signals.test.ts
├── markers.ts
├── markers.test.ts
├── node-runtime.test.ts
├── random.ts
├── random.test.ts
├── schema.ts
├── schema.test.ts
├── sequencing.ts
├── sequencing.test.ts
├── signals.ts
├── signals.test.ts
├── timecode.ts
└── timecode.test.ts
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
};

export type HeliosSubscriber = (state: HeliosState) => void;

export interface HeliosOptions {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
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

## D. Public Methods

```typescript
class Helios {
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
  public get width(): ReadonlySignal<number>;
  public get height(): ReadonlySignal<number>;
  public get duration(): number;
  public get fps(): number;

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

  public subscribe(callback: HeliosSubscriber): () => void;
  public unsubscribe(callback: HeliosSubscriber): void;

  public play(): void;
  public pause(): void;
  public seek(frame: number): void;

  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;
  public dispose(): void;
}
```
