# Context: Core (Logic Engine)

## A. Architecture
The Helios Core functions as a State Machine (Store -> Actions -> Subscribers) to maintain the "Truth of Time" (duration, fps, currentFrame) for animations. It manages the timeline state and synchronizes with the browser's native timeline (WAAPI) if configured.

## B. File Tree
```
packages/core/src/
├── animation-helpers.ts
├── index.test.ts
└── index.ts
```

## C. Type Definitions
```typescript
type HeliosState = {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
};

type Subscriber = (state: HeliosState) => void;

interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
}

interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}
```

## D. Public Methods
```typescript
class Helios {
  static diagnose(): Promise<DiagnosticReport>;
  constructor(options: HeliosOptions);

  // State Management
  getState(): Readonly<HeliosState>;

  // Subscription
  subscribe(callback: Subscriber): () => void;
  unsubscribe(callback: Subscriber): void;

  // Playback Controls
  play(): void;
  pause(): void;
  seek(frame: number): void;

  // Timeline Synchronization
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```
