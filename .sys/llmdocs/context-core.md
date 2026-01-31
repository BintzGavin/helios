# Core Context

## A. Architecture

Helios Core implements a **Signal-based State Machine** for video orchestration.
- **State**: Managed via reactive signals (`packages/core/src/signals.ts`).
- **Drivers**: Uses the Strategy pattern for time control (`TimeDriver`), allowing pluggable drivers like `DomDriver` (for browser sync) and `WaapiDriver`.
- **Reactivity**: Public properties (e.g., `currentFrame`) are ReadonlySignals that consumers can subscribe to.
- **Timing**: De-couples "wall clock" time from "video time" to support rendering and scrubbing.

## B. File Tree

```
packages/core/src/
├── drivers/
│   ├── DomDriver.ts
│   ├── ManualTicker.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── TimeoutTicker.ts
│   ├── WaapiDriver.ts
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
  currentTime: number;
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
  userAgent: string;
}
```

## D. Public Methods (Helios Class)

```typescript
class Helios {
  // Signals
  public get currentFrame(): ReadonlySignal<number>;
  public get currentTime(): ReadonlySignal<number>;
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

  // Methods
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
  public seekToTime(seconds: number): void;
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
