# CORE Context

## A. Architecture

The **Core** package is the pure TypeScript logic engine for Helios. It implements a **Headless Logic Engine** pattern where state management and timing are decoupled from the rendering environment.

Key Architectural Patterns:
1.  **Helios State Machine**: The `Helios` class manages the timeline state (`currentFrame`, `isPlaying`, `playbackRate`).
2.  **Reactive Signals**: Internal state is managed using fine-grained signals (`signal`, `computed`, `effect`) and exposed as `ReadonlySignal`.
3.  **Driver Strategy**: The `TimeDriver` interface abstracts the underlying timing mechanism (e.g., `DomDriver` for WAAPI/Media synchronization, `NoopDriver` for manual control).
4.  **Ticker Strategy**: The `Ticker` interface abstracts the loop mechanism (`RafTicker` for browser, `TimeoutTicker` for Node.js).
5.  **Structured Errors**: The `HeliosError` class provides machine-readable error codes for better AX (Agent Experience).
6.  **Environment Agnostic**: The core logic adapts to Browser (DOM) or Node.js environments.

## B. File Tree

```
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
├── easing.ts
├── errors.ts
├── index.ts
├── sequencing.ts
└── signals.ts
```

## C. Type Definitions

```typescript
export enum HeliosErrorCode {
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_FPS = 'INVALID_FPS',
  INVALID_INPUT_RANGE = 'INVALID_INPUT_RANGE',
  INVALID_OUTPUT_RANGE = 'INVALID_OUTPUT_RANGE',
  UNSORTED_INPUT_RANGE = 'UNSORTED_INPUT_RANGE',
  INVALID_SPRING_CONFIG = 'INVALID_SPRING_CONFIG'
}

export class HeliosError extends Error {
  public readonly code: HeliosErrorCode;
  public readonly suggestion?: string;
  static isHeliosError(error: unknown): error is HeliosError;
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
  // Constants
  readonly duration: number;
  readonly fps: number;

  // Signals
  get currentFrame(): ReadonlySignal<number>;
  get isPlaying(): ReadonlySignal<boolean>;
  get inputProps(): ReadonlySignal<Record<string, any>>;
  get playbackRate(): ReadonlySignal<number>;

  static diagnose(): Promise<DiagnosticReport>;

  constructor(options: HeliosOptions);

  getState(): Readonly<HeliosState>;
  setInputProps(props: Record<string, any>): void;
  setPlaybackRate(rate: number): void;

  subscribe(callback: HeliosSubscriber): () => void;
  unsubscribe(callback: HeliosSubscriber): void;

  play(): void;
  pause(): void;
  seek(frame: number): void;

  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```
