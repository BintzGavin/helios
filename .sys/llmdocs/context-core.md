# Context: CORE

## A. Architecture
The Core package implements the "Helios State Machine" pattern. Central state is managed via Signals (Observer pattern) in the `Helios` class. Updates flow from Actions (methods) -> State (Signals) -> Subscribers (via `subscribe`). Timing is driven by a pluggable `TimeDriver`.

## B. File Tree
```
packages/core/src/
├── animation.test.ts
├── animation.ts
├── captions.test.ts
├── captions.ts
├── color.test.ts
├── color.ts
├── drivers/
│   ├── DomDriver.test.ts
│   ├── DomDriver.ts
│   ├── NoopDriver.ts
│   ├── TimeDriver.ts
│   ├── TimeoutTicker.ts
│   ├── WaapiDriver.ts
│   └── index.ts
├── easing.test.ts
├── easing.ts
├── errors.ts
├── helios-audio.test.ts
├── index-signals.test.ts
├── index.test.ts
├── index.ts
├── markers.test.ts
├── markers.ts
├── node-runtime.test.ts
├── random.test.ts
├── random.ts
├── schema.test.ts
├── schema.ts
├── sequencing.test.ts
├── sequencing.ts
├── signals.test.ts
├── signals.ts
├── stability.test.ts
├── timecode.test.ts
├── timecode.ts
├── transitions.test.ts
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
  public get playbackRange(): ReadonlySignal<[number, number] | null>;
  public get width(): ReadonlySignal<number>;
  public get height(): ReadonlySignal<number>;
  public get duration(): number;
  public get fps(): number;

  static async diagnose(): Promise<DiagnosticReport>;

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
