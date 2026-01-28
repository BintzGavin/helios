# Context: CORE

## A. Architecture

Helios Core employs a reactive state machine architecture:
1.  **State**: Internal state (`currentFrame`, `isPlaying`, etc.) is managed using `Signal` primitives, ensuring atomic updates and dependency tracking.
2.  **Drivers**: The `TimeDriver` interface abstracts the underlying timing mechanism (e.g., `DomDriver` for WAAPI/media sync, `NoopDriver` for testing).
3.  **Synchronization**: The `Helios` class synchronizes the driver with its internal state signals.
4.  **Subscribers**: External consumers subscribe to state changes via the `subscribe` method.

## B. File Tree

```text
packages/core/src/
├── drivers/
│   ├── DomDriver.ts
│   ├── ManualTicker.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── Ticker.ts
│   ├── TimeDriver.ts
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
├── schema.ts
├── sequencing.ts
├── signals.ts
├── timecode.ts
└── transitions.ts
```

## C. Type Definitions

```typescript
// From packages/core/src/index.ts

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

// From packages/core/src/schema.ts

export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'color'
  | 'image'
  | 'video'
  | 'audio'
  | 'font';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
}

export type HeliosSchema = Record<string, PropDefinition>;
```

## D. Public Methods

```typescript
// Helios Class

static diagnose(): Promise<DiagnosticReport>;

constructor(options: HeliosOptions);

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
play(): void;
pause(): void;
seek(frame: number): void;
waitUntilStable(): Promise<void>;
bindToDocumentTimeline(): void;
unbindFromDocumentTimeline(): void;
dispose(): void;
```
