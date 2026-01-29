# CORE Domain Context

## A. Architecture

The Core domain implements the "Helios State Machine" pattern, serving as the headless logic engine for the video creation framework. It is strictly decoupled from the view layer (DOM/Canvas).

- **Store**: State is managed via reactive signals (`packages/core/src/signals.ts`), ensuring efficient updates.
- **Actions**: The `Helios` class exposes methods to mutate state (e.g., `seek()`, `setDuration()`).
- **Subscribers**: External consumers (Renderer, Player) subscribe to state changes to update the view.
- **Drivers**: Timing is abstracted via `TimeDriver` (e.g., `DomDriver` for WAAPI sync, `NoopDriver` for headless).

## B. File Tree

```
packages/core/src/
├── drivers/
│   ├── DomDriver.ts
│   ├── DomDriver.test.ts
│   ├── TimeDriver.ts
│   ├── WaapiDriver.ts
│   └── index.ts
├── animation.ts
├── animation.test.ts
├── captions.ts
├── captions.test.ts
├── color.ts
├── color.test.ts
├── easing.ts
├── easing.test.ts
├── errors.ts
├── helios-audio.test.ts
├── index.ts
├── index.test.ts
├── markers.ts
├── markers.test.ts
├── random.ts
├── random.test.ts
├── schema.ts
├── schema.test.ts
├── sequencing.ts
├── sequencing.test.ts
├── signals.ts
├── signals.test.ts
├── stability.test.ts
├── timecode.ts
├── timecode.test.ts
├── transitions.ts
└── transitions.test.ts
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

// From signals.ts
export interface Signal<T> {
  value: T;
  peek(): T;
}
export interface ReadonlySignal<T> {
  value: T;
  peek(): T;
}

// From schema.ts
export type PropType = 'string' | 'number' | 'boolean' | 'color' | 'enum' | 'image' | 'video' | 'audio' | 'font';
export interface PropSchema {
  type: PropType;
  default?: any;
  label?: string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
}
export type HeliosSchema = Record<string, PropSchema>;

// From captions.ts
export interface CaptionCue {
  id: string;
  startTime: number; // ms
  endTime: number; // ms
  text: string;
}

// From markers.ts
export interface Marker {
  id: string;
  time: number; // seconds
  label?: string;
  color?: string;
}
```

## D. Public Methods (Helios Class)

```typescript
class Helios {
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

  // Static
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

  // Stability
  public registerStabilityCheck(check: StabilityCheck): () => void;
  public async waitUntilStable(): Promise<void>;

  // Playback
  public play(): void;
  public pause(): void;
  public seek(frame: number): void;

  // External Sync
  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;

  public dispose(): void;
}
```
