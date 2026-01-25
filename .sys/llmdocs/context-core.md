# CORE Domain Context

## A. Architecture
The `packages/core` module is the framework-agnostic engine of Helios. It manages the animation lifecycle, state, and timing.

**Key Concepts:**
- **Helios Class**: The main entry point. It orchestrates the animation loop and manages state.
- **Signals**: State management is built on top of a custom Signals implementation (inspired by Preact/Solid), allowing for fine-grained reactivity.
- **TimeDriver**: An abstraction for the timing source (e.g., WAAPI, RequestAnimationFrame, or external CDP control).
- **Sequencing**: Pure functions for arranging clips in time.

## B. File Tree
```
packages/core/src/
├── drivers/
│   ├── index.ts
│   ├── noop-driver.ts
│   ├── time-driver.ts
│   └── waapi-driver.ts
├── animation.ts
├── index.ts
├── sequencing.ts
└── signals.ts
```

## C. Type Definitions

```typescript
// From index.ts
export interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
  playbackRate?: number;
  driver?: TimeDriver;
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
  subscribe(fn: (value: T) => void): () => void;
}

export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
  subscribe(fn: (value: T) => void): () => void;
}

// From drivers/time-driver.ts
export interface TimeDriver {
  init(scope: HTMLElement | Document): void;
  update(currentTimeMs: number): void;
}
```

## D. Public Methods

```typescript
export class Helios {
  // Public Signals
  public get currentFrame(): ReadonlySignal<number>;
  public get isPlaying(): ReadonlySignal<boolean>;
  public get inputProps(): ReadonlySignal<Record<string, any>;
  public get playbackRate(): ReadonlySignal<number>;

  // Properties
  public readonly duration: number;
  public readonly fps: number;

  static diagnose(): Promise<DiagnosticReport>;

  constructor(options: HeliosOptions);

  // State Access (Legacy)
  public getState(): Readonly<HeliosState>;

  // Controls
  public setInputProps(props: Record<string, any>): void;
  public setPlaybackRate(rate: number): void;
  public subscribe(callback: Subscriber): () => void;
  public unsubscribe(callback: Subscriber): void;
  public play(): void;
  public pause(): void;
  public seek(frame: number): void;

  // External Synchronization
  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;
}
```
