# Core Context

## A. Architecture

The `packages/core` module is the heart of the Helios system. It implements a **Helios State Machine** pattern.

- **Store**: The `Helios` class holds the state (`currentFrame`, `isPlaying`, `inputProps`, `playbackRate`, `volume`, `muted`, `activeCaptions`, `width`, `height`) using **Signals** (observable state primitives).
- **Actions**: Methods like `play()`, `pause()`, `seek()`, `setInputProps()`, `setAudioVolume()`, `setCaptions()`, `setSize()` modify the state.
- **Subscribers**: The UI (Studio, Player) and Drivers subscribe to state changes to update the DOM or other outputs.
- **Drivers**: `TimeDriver` implementations (like `DomDriver`) synchronize the internal timeline with external systems (like WAAPI or HTMLMediaElements). `DomDriver` supports relative audio mixing, preserving user-set volume levels while applying master scaling.
- **Ticker**: A `Ticker` (RafTicker or TimeoutTicker) drives the frame advancement loop when playing.
- **Schema**: An optional `HeliosSchema` defines the structure and types of `inputProps` for validation.

## B. File Tree

```
packages/core/src/
├── animation.ts       # Animation helpers (spring, interpolate)
├── captions.ts        # SRT parsing, serialization, and cue helpers
├── color.ts           # Color parsing and interpolation
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
  width: number;
  height: number;
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
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
}

export type HeliosSchema = Record<string, PropDefinition>;

export interface HeliosOptions {
  width?: number;
  height?: number;
  initialFrame?: number;
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

export type ExtrapolateType = 'extend' | 'clamp' | 'identity';

export interface InterpolateOptions {
  extrapolateLeft?: ExtrapolateType;
  extrapolateRight?: ExtrapolateType;
  easing?: (t: number) => number;
}

export interface SpringConfig {
  mass?: number;
  stiffness?: number;
  damping?: number;
  overshootClamping?: boolean;
}

export interface SpringOptions {
  frame: number;
  fps: number;
  config?: SpringConfig;
  from?: number;
  to?: number;
  durationInFrames?: number;
}

export interface SequenceOptions {
  frame: number;
  from: number;
  durationInFrames?: number;
}

export interface SequenceResult {
  localFrame: number;
  relativeFrame: number;
  progress: number;
  isActive: boolean;
}

export interface SeriesItem {
  durationInFrames: number;
  offset?: number;
}

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
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
  public get width(): ReadonlySignal<number>;
  public get height(): ReadonlySignal<number>;

  // Static Methods
  static diagnose(): Promise<DiagnosticReport>;

  // Lifecycle
  constructor(options: HeliosOptions);
  public dispose(): void;

  // Accessors
  public getState(): Readonly<HeliosState>;

  // State Modifiers
  public setSize(width: number, height: number): void;
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

## E. Public Utilities

```typescript
/**
 * Generates a deterministic random number between 0 and 1 based on a seed.
 */
export function random(seed: number | string): number;

/**
 * Maps an input value within a range to an output value.
 */
export function interpolate(
  input: number,
  inputRange: number[],
  outputRange: number[],
  options?: InterpolateOptions
): number;

/**
 * Parses a color string into an RGBA object.
 */
export function parseColor(color: string): RgbaColor;

/**
 * Interpolates between colors based on an input value.
 */
export function interpolateColors(
  input: number,
  inputRange: number[],
  outputRange: string[],
  options?: InterpolateOptions
): string;

/**
 * Calculates the value of a spring physics simulation.
 */
export function spring(options: SpringOptions): number;

/**
 * Calculates the local time and progress of a sequence relative to a start frame.
 */
export function sequence(options: SequenceOptions): SequenceResult;

/**
 * Calculates a sequence of start frames for a list of items.
 */
export function series<T extends SeriesItem>(items: T[], startFrame?: number): (T & { from: number })[];
```
