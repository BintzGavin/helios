# CORE Domain Context

## A. Architecture

The Core domain implements the `Helios` engine, a framework-agnostic video creation engine.

**Key Patterns:**
1.  **Signal-Based State:** Internal state (`currentFrame`, `isPlaying`, etc.) is managed using fine-grained `Signal<T>` primitives.
2.  **Reactivity:** Public properties expose `ReadonlySignal<T>` which allows consumers (like UI or Renderer) to subscribe to specific changes without polling.
3.  **Time Driver Strategy:** The engine uses a `TimeDriver` abstraction (`WaapiDriver`, `NoopDriver`, or custom) to manage the animation loop, decoupling logic from the execution environment (DOM vs Node.js).
4.  **Legacy Compatibility:** The `subscribe(callback)` method is maintained using an `effect` wrapper, ensuring backward compatibility with the monolithic state object pattern.
5.  **Standard Library:** Includes built-in helpers for animation (`interpolate`, `spring`), easing (`Easing`), and sequencing (`sequence`, `series`).

## B. File Tree

```
packages/core/src/
├── drivers/           # TimeDriver implementations (Waapi, Noop)
├── animation.ts       # Animation helpers (interpolate, spring)
├── easing.ts          # Easing functions and types
├── index.ts           # Main entry point, Helios class
├── sequencing.ts      # Sequencing primitives (sequence, series)
└── signals.ts         # Signal/Effect/Computed implementation
```

## C. Type Definitions

```typescript
// packages/core/src/index.ts

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

// packages/core/src/easing.ts

export type EasingFunction = (t: number) => number;

// packages/core/src/signals.ts

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

export interface Subscription {
  unsubscribe(): void;
}
```

## D. Public Methods

```typescript
export class Helios {
  // Public Readonly Signals
  public get currentFrame(): ReadonlySignal<number>;
  public get isPlaying(): ReadonlySignal<boolean>;
  public get inputProps(): ReadonlySignal<Record<string, any>>;
  public get playbackRate(): ReadonlySignal<number>;

  // Static
  static diagnose(): Promise<DiagnosticReport>;

  constructor(options: HeliosOptions);

  // State Access
  public getState(): Readonly<HeliosState>;
  public setInputProps(props: Record<string, any>): void;
  public setPlaybackRate(rate: number): void;

  // Subscription
  public subscribe(callback: Subscriber): () => void;
  public unsubscribe(callback: Subscriber): void;

  // Playback Controls
  public play(): void;
  public pause(): void;
  public seek(frame: number): void;

  // Timeline Synchronization
  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;
}
```
