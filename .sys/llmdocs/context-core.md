# Context: CORE

## A. Architecture
The `packages/core` module is the framework-agnostic engine for Helios. It manages the animation state (timeline, playback status) and driving loop.
The architecture is evolving from a strict `Helios` class state machine towards a fine-grained reactivity model using **Signals**.
Currently, `Helios` class manages state via `setState` and notifies a `Set` of subscribers.
New primitives (`signal`, `computed`, `effect`) are available to support future reactive state management.

## B. File Tree
```
packages/core/src/
├── animation.ts       # Animation helpers (interpolate, spring)
├── drivers/           # TimeDriver implementations (WaapiDriver, etc.)
├── index.ts           # Public API exports
├── sequencing.ts      # Sequencing primitives (sequence, series)
└── signals.ts         # Reactivity primitives (signal, computed, effect)
```

## C. Type Definitions
```typescript
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
### `Helios`
- `constructor(options: HeliosOptions)`
- `getState(): Readonly<HeliosState>`
- `setInputProps(props: Record<string, any>): void`
- `setPlaybackRate(rate: number): void`
- `subscribe(callback: Subscriber): () => void`
- `play(): void`
- `pause(): void`
- `seek(frame: number): void`
- `bindToDocumentTimeline(): void`
- `unbindFromDocumentTimeline(): void`
- `static diagnose(): Promise<DiagnosticReport>`

### Signals
- `signal<T>(value: T): Signal<T>`
- `computed<T>(fn: () => T): ReadonlySignal<T>`
- `effect(fn: () => void): () => void`
