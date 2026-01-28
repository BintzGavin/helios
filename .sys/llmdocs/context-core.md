# Core Domain Context

## A. Architecture

The Core domain implements the "Helios State Machine" pattern. It is a pure logic engine that manages the timeline, state, and synchronization of the composition. It has zero UI dependencies.

**Key Components:**
- **Store**: The `Helios` class holds the state (current frame, duration, props, captions, markers) using Signals.
- **Actions**: Methods like `seek`, `play`, `setDuration`, `waitUntilStable` modify the state.
- **Subscribers**: The UI (Player) and Renderer subscribe to state changes to update the view.
- **Drivers**: The `TimeDriver` interface (implemented by `DomDriver`) synchronizes the internal time with the browser's animation timeline (WAAPI) and media elements (HTMLMediaElement).

## B. File Tree

```
packages/core/src/
├── animation.ts
├── captions.ts
├── color.ts
├── drivers
│   ├── DomDriver.ts
│   ├── ManualTicker.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── Ticker.ts
│   ├── TimeDriver.ts
│   ├── TimeoutTicker.ts
│   ├── WaapiDriver.ts
│   └── index.ts
├── easing.ts
├── errors.ts
├── index.ts
├── markers.ts
├── random.ts
├── schema.ts
├── sequencing.ts
├── signals.ts
├── timecode.ts
```

## C. Type Definitions

```typescript
// packages/core/src/index.ts

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

// packages/core/src/drivers/TimeDriver.ts

export interface TimeDriver {
  init(scope: HTMLElement | Document): void;
  update(timeInMs: number, options?: { isPlaying: boolean; playbackRate: number; volume?: number; muted?: boolean }): void;
  waitUntilStable(): Promise<void>;
  dispose?(): void;
}
```

## D. Public Methods

```typescript
// packages/core/src/index.ts

export class Helios {
  // Signals
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
  public play(): void;
  public pause(): void;
  public seek(frame: number): void;
  public waitUntilStable(): Promise<void>;
  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;
  public dispose(): void;
}
```
