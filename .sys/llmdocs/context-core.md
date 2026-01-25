# Core Domain Context

## A. Architecture

The `packages/core` module implements the **Helios State Machine**, which is the central nervous system of the application. It follows a reactive pattern using Signals.

- **Helios Class**: The main orchestrator. It manages:
  - **State**: `currentFrame`, `isPlaying`, `playbackRate`, `inputProps` (all Signals).
  - **Loop**: Uses a `Ticker` strategy (e.g., `RafTicker`) to drive the animation loop.
  - **Drivers**: Uses a `TimeDriver` strategy (e.g., `DomDriver`) to synchronize external entities (WAAPI, Audio, Video).
- **Signals**: A reactivity system (`signal`, `computed`, `effect`) inspired by Preact/Solid signals. This allows granular subscriptions to state changes without polling or heavy event emitters.
- **Drivers**: The `DomDriver` synchronizes both WAAPI animations and `HTMLMediaElement`s (`<audio>`, `<video>`) with the Helios timeline.

## B. File Tree

```
packages/core/src/
├── animation.ts       # Animation primitives (interpolate, spring)
├── drivers/           # Time synchronization strategies
│   ├── DomDriver.ts   # Syncs WAAPI and Media Elements (Default)
│   ├── ManualTicker.ts # For testing
│   ├── NoopDriver.ts  # No-op implementation
│   ├── RafTicker.ts   # RequestAnimationFrame loop
│   ├── Ticker.ts      # Ticker interface
│   ├── TimeDriver.ts  # Driver interface
│   ├── WaapiDriver.ts # (Deprecated) Syncs only WAAPI
│   └── index.ts
├── easing.ts          # Easing functions
├── index.ts           # Main Helios class entry point
├── sequencing.ts      # Sequencing helpers (sequence, series)
├── signals.ts         # Reactive signals implementation
└── types.ts           # Shared types
```

## C. Type Definitions

```typescript
// signals.ts
export interface ReadonlySignal<T> {
    readonly value: T;
    peek(): T;
}
export interface Signal<T> extends ReadonlySignal<T> {
    value: T;
}

// drivers/TimeDriver.ts
export interface TimeDriver {
  init(scope: HTMLElement | Document): void;
  update(timeInMs: number, options?: { isPlaying: boolean; playbackRate: number }): void;
}

// drivers/Ticker.ts
export interface Ticker {
  start(callback: (deltaTime: number) => void): void;
  stop(): void;
  tick(deltaTime: number): void;
}

// index.ts
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

export type HeliosState = {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
};

export type HeliosSubscriber = (state: HeliosState) => void;
```

## D. Public Methods (Helios)

```typescript
class Helios {
    // Readonly Signals
    get currentFrame(): ReadonlySignal<number>;
    get isPlaying(): ReadonlySignal<boolean>;
    get inputProps(): ReadonlySignal<Record<string, any>>;
    get playbackRate(): ReadonlySignal<number>;

    constructor(options: HeliosOptions);

    static diagnose(): Promise<DiagnosticReport>;

    // State Access
    getState(): Readonly<HeliosState>;

    // Controls
    play(): void;
    pause(): void;
    seek(frame: number): void;
    setPlaybackRate(rate: number): void;
    setInputProps(props: Record<string, any>): void;

    // Subscription
    subscribe(callback: HeliosSubscriber): () => void;
    unsubscribe(callback: HeliosSubscriber): void;

    // External Sync
    bindToDocumentTimeline(): void;
    unbindFromDocumentTimeline(): void;
}
```
