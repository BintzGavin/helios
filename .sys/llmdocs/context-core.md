# Core Context

## A. Architecture

The `packages/core` module is the heart of the Helios system. It implements a **Helios State Machine** pattern.

- **Store**: The `Helios` class holds the state (`currentFrame`, `isPlaying`, `inputProps`, `playbackRate`, `volume`, `muted`, `activeCaptions`) using **Signals** (observable state primitives).
- **Actions**: Methods like `play()`, `pause()`, `seek()`, `setInputProps()`, `setAudioVolume()`, `setCaptions()` modify the state.
- **Subscribers**: The UI (Studio, Player) and Drivers subscribe to state changes to update the DOM or other outputs.
- **Drivers**: `TimeDriver` implementations (like `DomDriver`) synchronize the internal timeline with external systems (like WAAPI or HTMLMediaElements).
- **Ticker**: A `Ticker` (RafTicker or TimeoutTicker) drives the frame advancement loop when playing.
- **Schema**: An optional `HeliosSchema` defines the structure and types of `inputProps` for validation.

## B. File Tree

```
packages/core/src/
├── animation.ts       # Animation helpers (spring, interpolate)
├── captions.ts        # SRT parsing, serialization, and cue helpers
├── drivers/           # TimeDriver implementations (DomDriver, etc.)
├── easing.ts          # Easing functions
├── errors.ts          # Structured Error Handling
├── index.ts           # Public API entry point (Helios class)
├── random.ts          # Deterministic PRNG
├── schema.ts          # Schema definition and validation
├── sequencing.ts      # Sequencing helpers (sequence, series)
└── signals.ts         # Signal/Effect implementation
```

## C. Type Definitions

```typescript
export type HeliosState = {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
  volume: number;
  muted: boolean;
  activeCaptions: CaptionCue[];
};

export type HeliosSubscriber = (state: HeliosState) => void;

export type PropType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'color';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
}

export type HeliosSchema = Record<string, PropDefinition>;

export interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  captions?: string;
  driver?: TimeDriver;
  ticker?: Ticker;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}

export interface CaptionCue {
  id: string;
  startTime: number; // in milliseconds
  endTime: number;   // in milliseconds
  text: string;
}
```

## D. Public Methods

```typescript
class Helios {
  // Properties
  public readonly duration: number;
  public readonly fps: number;
  public readonly schema?: HeliosSchema;

  // Readonly Signals
  public get currentFrame(): ReadonlySignal<number>;
  public get isPlaying(): ReadonlySignal<boolean>;
  public get inputProps(): ReadonlySignal<Record<string, any>>;
  public get playbackRate(): ReadonlySignal<number>;
  public get volume(): ReadonlySignal<number>;
  public get muted(): ReadonlySignal<boolean>;
  public get activeCaptions(): ReadonlySignal<CaptionCue[]>;

  // Static Methods
  static diagnose(): Promise<DiagnosticReport>;

  // Lifecycle
  constructor(options: HeliosOptions);
  public dispose(): void;

  // Accessors
  public getState(): Readonly<HeliosState>;

  // State Modifiers
  public setInputProps(props: Record<string, any>): void;
  public setPlaybackRate(rate: number): void;
  public setAudioVolume(volume: number): void;
  public setAudioMuted(muted: boolean): void;
  public setCaptions(captions: string | CaptionCue[]): void;

  // Subscription
  public subscribe(callback: HeliosSubscriber): () => void;
  public unsubscribe(callback: HeliosSubscriber): void;

  // Playback Controls
  public play(): void;
  public pause(): void;
  public seek(frame: number): void;

  // Timeline Synchronization
  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;
}
```
