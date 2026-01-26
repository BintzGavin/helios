# Core Context

## A. Architecture

The `packages/core` module is the heart of the Helios system. It implements a **Helios State Machine** pattern.

- **Store**: The `Helios` class holds the state (`currentFrame`, `isPlaying`, `inputProps`, `playbackRate`) using **Signals** (observable state primitives).
- **Actions**: Methods like `play()`, `pause()`, `seek()`, `setInputProps()` modify the state.
- **Subscribers**: The UI (Studio, Player) and Drivers subscribe to state changes to update the DOM or other outputs.
- **Drivers**: `TimeDriver` implementations (like `DomDriver`) synchronize the internal timeline with external systems (like WAAPI or HTMLMediaElements).
- **Ticker**: A `Ticker` (RafTicker or TimeoutTicker) drives the frame advancement loop when playing.

## B. File Tree

```
packages/core/src/
├── animation.ts       # Animation helpers (spring, interpolate)
├── drivers/           # TimeDriver implementations (DomDriver, etc.)
├── easing.ts          # Easing functions
├── errors.ts          # Structured Error Handling
├── index.ts           # Public API entry point (Helios class)
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
};

export type HeliosSubscriber = (state: HeliosState) => void;

export interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
  playbackRate?: number;
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
  // Readonly Signals
  public get currentFrame(): ReadonlySignal<number>;
  public get isPlaying(): ReadonlySignal<boolean>;
  public get inputProps(): ReadonlySignal<Record<string, any>>;
  public get playbackRate(): ReadonlySignal<number>;

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
