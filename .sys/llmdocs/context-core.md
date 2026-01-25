# CORE Domain Context

## A. Architecture
The Core domain implements the "Helios State Machine" pattern. It is the pure logic engine that drives the application.
- **Store**: `Helios` class holds the state (`currentFrame`, `isPlaying`, `inputProps`).
- **Actions**: Methods like `play()`, `pause()`, `seek()`, `setInputProps()` modify the state.
- **Subscribers**: External components (Player, Renderer) subscribe to state changes via `subscribe()`.
- **TimeDriver**: Decouples time synchronization logic. `Helios` delegates environment updates (like WAAPI `currentTime`) to a `TimeDriver` implementation (`WaapiDriver` or `NoopDriver`).

## B. File Tree
```
packages/core/src/
├── drivers/
│   ├── NoopDriver.ts
│   ├── TimeDriver.ts
│   ├── WaapiDriver.ts
│   └── index.ts
├── animation.ts
├── index.test.ts
├── index.ts
└── types.ts (if applicable)
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

export interface TimeDriver {
  init(scope: HTMLElement | Document): void;
  update(timeInMs: number): void;
}
```

## D. Public Methods
```typescript
class Helios {
  static diagnose(): Promise<DiagnosticReport>;
  constructor(options: HeliosOptions);
  getState(): Readonly<HeliosState>;
  setInputProps(props: Record<string, any>): void;
  setPlaybackRate(rate: number): void;
  subscribe(callback: Subscriber): () => void;
  unsubscribe(callback: Subscriber): void;
  play(): void;
  pause(): void;
  seek(frame: number): void;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```
