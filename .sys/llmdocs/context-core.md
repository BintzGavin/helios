# Context: Core

## A. Architecture

The Core package follows the "Helios State Machine" pattern:
1.  **Store**: Reactive state using lightweight Signals (`currentFrame`, `isPlaying`, etc.).
2.  **Actions**: Public methods (`play`, `seek`, `setInputProps`) that mutate state.
3.  **Subscribers**: External consumers (Renderer, Player) subscribe to state changes or frames.
4.  **Drivers**: Abstracted time control via `TimeDriver` (DOM-based, WAAPI-based, or Noop).

## B. File Tree

packages/core/src/
├── drivers/
├── animation.test.ts
├── animation.ts
├── audio.test.ts
├── captions.test.ts
├── captions.ts
├── color.test.ts
├── color.ts
├── easing.test.ts
├── easing.ts
├── errors.ts
├── index-signals.test.ts
├── index.test.ts
├── index.ts
├── node-runtime.test.ts
├── random.test.ts
├── random.ts
├── schema.test.ts
├── schema.ts
├── sequencing.test.ts
├── sequencing.ts
├── signals.test.ts
├── signals.ts
├── timecode.test.ts
└── timecode.ts

## C. Type Definitions

```typescript
// packages/core/src/index.ts
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
};

export type HeliosSubscriber = (state: HeliosState) => void;

export interface HeliosOptions {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  captions?: string | CaptionCue[];
  driver?: TimeDriver;
  ticker?: Ticker;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}

// packages/core/src/schema.ts
export type PropType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'color';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
}

export type HeliosSchema = Record<string, PropDefinition>;

// packages/core/src/captions.ts
export interface CaptionCue {
  id: string;
  startTime: number; // in milliseconds
  endTime: number;   // in milliseconds
  text: string;
}

// packages/core/src/signals.ts
export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
  subscribe(fn: (value: T) => void): () => void;
}

// packages/core/src/errors.ts
export enum HeliosErrorCode {
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_FPS = 'INVALID_FPS',
  INVALID_INPUT_RANGE = 'INVALID_INPUT_RANGE',
  INVALID_OUTPUT_RANGE = 'INVALID_OUTPUT_RANGE',
  UNSORTED_INPUT_RANGE = 'UNSORTED_INPUT_RANGE',
  INVALID_SPRING_CONFIG = 'INVALID_SPRING_CONFIG',
  INVALID_SRT_FORMAT = 'INVALID_SRT_FORMAT',
  INVALID_INPUT_PROPS = 'INVALID_INPUT_PROPS',
  INVALID_RESOLUTION = 'INVALID_RESOLUTION',
  INVALID_COLOR_FORMAT = 'INVALID_COLOR_FORMAT',
  INVALID_TIMECODE_FORMAT = 'INVALID_TIMECODE_FORMAT'
}
```

## D. Public Methods

```typescript
export class Helios {
  // Constants (Getters)
  public get duration(): number;
  public get fps(): number;

  // Readonly Signals
  public get currentFrame(): ReadonlySignal<number>;
  public get loop(): ReadonlySignal<boolean>;
  public get isPlaying(): ReadonlySignal<boolean>;
  public get inputProps(): ReadonlySignal<Record<string, any>>;
  public get playbackRate(): ReadonlySignal<number>;
  public get volume(): ReadonlySignal<number>;
  public get muted(): ReadonlySignal<boolean>;
  public get captions(): ReadonlySignal<CaptionCue[]>;
  public get activeCaptions(): ReadonlySignal<CaptionCue[]>;
  public get width(): ReadonlySignal<number>;
  public get height(): ReadonlySignal<number>;

  // Static Methods
  static diagnose(): Promise<DiagnosticReport>;

  // Lifecycle
  constructor(options: HeliosOptions);
  public dispose(): void;

  // State Access
  public getState(): Readonly<HeliosState>;

  // Actions
  public setSize(width: number, height: number): void;
  public setLoop(shouldLoop: boolean): void;
  public setDuration(seconds: number): void;
  public setFps(fps: number): void;
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

  // Timeline Binding
  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;
}
```

## E. Exported Utilities

```typescript
// packages/core/src/timecode.ts
export function framesToTimecode(frame: number, fps: number): string;
export function timecodeToFrames(timecode: string, fps: number): number;
export function framesToTimestamp(frame: number, fps: number): string;
```
