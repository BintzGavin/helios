import { TimeDriver, WaapiDriver, DomDriver, NoopDriver, Ticker, RafTicker, TimeoutTicker } from './drivers';
import { signal, effect, computed, Signal, ReadonlySignal } from './signals';
import { HeliosError, HeliosErrorCode } from './errors';
import { HeliosSchema, validateProps } from './schema';
import { CaptionCue, parseSrt, findActiveCues, areCuesEqual } from './captions';

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

export * from './animation';
export * from './drivers';
export * from './easing';
export * from './sequencing';
export * from './signals';
export * from './errors';
export * from './captions';
export * from './schema';
export * from './random';
export * from './color';

export class Helios {
  // Constants
  public readonly duration: number;
  public readonly fps: number;
  public readonly schema?: HeliosSchema;

  // Internal Signals
  private _currentFrame: Signal<number>;
  private _isPlaying: Signal<boolean>;
  private _inputProps: Signal<Record<string, any>>;
  private _playbackRate: Signal<number>;
  private _volume: Signal<number>;
  private _muted: Signal<boolean>;
  private _captions: Signal<CaptionCue[]>;
  private _activeCaptions: Signal<CaptionCue[]>;
  private _width: Signal<number>;
  private _height: Signal<number>;

  // Public Readonly Signals

  /**
   * Signal for the current frame number.
   * Can be subscribed to for reactive updates.
   */
  public get currentFrame(): ReadonlySignal<number> { return this._currentFrame; }

  /**
   * Signal for the playback state (playing or paused).
   * Can be subscribed to for reactive updates.
   */
  public get isPlaying(): ReadonlySignal<boolean> { return this._isPlaying; }

  /**
   * Signal for the input properties.
   * Can be subscribed to for reactive updates.
   */
  public get inputProps(): ReadonlySignal<Record<string, any>> { return this._inputProps; }

  /**
   * Signal for the playback rate (speed multiplier).
   * Can be subscribed to for reactive updates.
   */
  public get playbackRate(): ReadonlySignal<number> { return this._playbackRate; }

  /**
   * Signal for the audio volume (0.0 to 1.0).
   * Can be subscribed to for reactive updates.
   */
  public get volume(): ReadonlySignal<number> { return this._volume; }

  /**
   * Signal for the audio muted state.
   * Can be subscribed to for reactive updates.
   */
  public get muted(): ReadonlySignal<boolean> { return this._muted; }

  /**
   * Signal for the full list of captions.
   * Can be subscribed to for reactive updates.
   */
  public get captions(): ReadonlySignal<CaptionCue[]> { return this._captions; }

  /**
   * Signal for the currently active captions.
   * Can be subscribed to for reactive updates.
   */
  public get activeCaptions(): ReadonlySignal<CaptionCue[]> {
    return this._activeCaptions;
  }

  /**
   * Signal for the canvas width.
   * Can be subscribed to for reactive updates.
   */
  public get width(): ReadonlySignal<number> { return this._width; }

  /**
   * Signal for the canvas height.
   * Can be subscribed to for reactive updates.
   */
  public get height(): ReadonlySignal<number> { return this._height; }

  // Other internals
  private syncWithDocumentTimeline = false;
  private autoSyncAnimations = false;
  private animationScope: HTMLElement | Document = typeof document !== 'undefined' ? document : ({} as Document);
  private driver: TimeDriver;
  private ticker: Ticker;
  private subscriberMap = new Map<HeliosSubscriber, () => void>();

  static async diagnose(): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      waapi: typeof document !== 'undefined' && 'timeline' in document,
      webCodecs: typeof VideoEncoder !== 'undefined',
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Server',
    };

    console.group('Helios Diagnostics');
    console.log('WAAPI Support:', report.waapi ? '✅' : '❌');
    console.log('WebCodecs Support:', report.webCodecs ? '✅' : '❌');
    console.log('OffscreenCanvas Support:', report.offscreenCanvas ? '✅' : '❌');
    console.log('User Agent:', report.userAgent);

    if (!report.webCodecs) console.warn('Hardware accelerated rendering requires WebCodecs.');
    console.log('To verify GPU acceleration, please visit: chrome://gpu');
    console.groupEnd();

    return report;
  }

  constructor(options: HeliosOptions) {
    if (options.duration < 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_DURATION,
        "Duration must be non-negative",
        "Ensure the 'duration' option passed to the Helios constructor is >= 0."
      );
    }
    if (options.fps <= 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_FPS,
        "FPS must be greater than 0",
        "Ensure the 'fps' option passed to the Helios constructor is > 0."
      );
    }

    const width = options.width ?? 1920;
    const height = options.height ?? 1080;

    if (width <= 0 || height <= 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_RESOLUTION,
        "Resolution must be positive",
        "Ensure the 'width' and 'height' options are greater than 0."
      );
    }

    this.duration = options.duration;
    this.fps = options.fps;
    this.schema = options.schema;

    const initialProps = validateProps(options.inputProps || {}, this.schema);
    const initialCaptions = options.captions
      ? (typeof options.captions === 'string' ? parseSrt(options.captions) : options.captions)
      : [];

    // Initialize Initial Frame
    const totalFrames = options.duration * options.fps;
    const initialFrameRaw = options.initialFrame || 0;
    const initialFrame = Math.max(0, Math.min(initialFrameRaw, totalFrames));

    // Initialize signals
    this._currentFrame = signal(initialFrame);
    this._isPlaying = signal(false);
    this._inputProps = signal(initialProps);
    this._playbackRate = signal(options.playbackRate ?? 1);
    this._volume = signal(options.volume ?? 1);
    this._muted = signal(options.muted ?? false);
    this._captions = signal(initialCaptions);
    this._width = signal(width);
    this._height = signal(height);

    this._activeCaptions = signal(findActiveCues(initialCaptions, 0));

    effect(() => {
      const timeMs = (this._currentFrame.value / this.fps) * 1000;
      const active = findActiveCues(this._captions.value, timeMs);

      if (!areCuesEqual(active, this._activeCaptions.peek())) {
        this._activeCaptions.value = active;
      }
    });

    this.autoSyncAnimations = options.autoSyncAnimations || false;
    if (options.animationScope) {
      this.animationScope = options.animationScope;
    }

    // Driver Selection Strategy
    if (options.driver) {
      this.driver = options.driver;
    } else if (this.autoSyncAnimations) {
      this.driver = new DomDriver();
    } else {
      this.driver = new NoopDriver();
    }

    this.driver.init(this.animationScope);

    // Sync driver with initial state
    this.driver.update((this._currentFrame.value / this.fps) * 1000, {
      isPlaying: this._isPlaying.value,
      playbackRate: this._playbackRate.value,
      volume: this._volume.value,
      muted: this._muted.value
    });

    // Ticker Selection
    this.ticker = options.ticker || (typeof requestAnimationFrame !== 'undefined' ? new RafTicker() : new TimeoutTicker());
  }

  public getState(): Readonly<HeliosState> {
    return {
      width: this._width.value,
      height: this._height.value,
      duration: this.duration,
      fps: this.fps,
      currentFrame: this._currentFrame.value,
      isPlaying: this._isPlaying.value,
      inputProps: this._inputProps.value,
      playbackRate: this._playbackRate.value,
      volume: this._volume.value,
      muted: this._muted.value,
      captions: this._captions.value,
      activeCaptions: this.activeCaptions.value,
    };
  }

  public setSize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_RESOLUTION,
        "Resolution must be positive",
        "Ensure the 'width' and 'height' passed to setSize are greater than 0."
      );
    }
    this._width.value = width;
    this._height.value = height;
  }

  /**
   * Updates the input properties for the composition.
   * This triggers a state update and notifies subscribers.
   * @param props A record of properties to pass to the composition.
   */
  public setInputProps(props: Record<string, any>) {
    this._inputProps.value = validateProps(props, this.schema);
  }

  public setPlaybackRate(rate: number) {
    this._playbackRate.value = rate;
  }

  public setAudioVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this._volume.value = clamped;

    // Sync driver immediately
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this.fps) * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: clamped,
      muted: this._muted.peek()
    });
  }

  public setAudioMuted(muted: boolean) {
    this._muted.value = muted;

    // Sync driver immediately
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this.fps) * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: muted
    });
  }

  /**
   * Updates the captions for the composition.
   * @param captions SRT string or array of CaptionCue objects.
   */
  public setCaptions(captions: string | CaptionCue[]) {
    const cues = typeof captions === 'string' ? parseSrt(captions) : captions;
    this._captions.value = cues;
  }

  // --- Subscription ---
  public subscribe(callback: HeliosSubscriber): () => void {
    const dispose = effect(() => {
      callback(this.getState());
    });

    this.subscriberMap.set(callback, dispose);

    return () => this.unsubscribe(callback);
  }

  public unsubscribe(callback: HeliosSubscriber) {
    const dispose = this.subscriberMap.get(callback);
    if (dispose) {
      dispose();
      this.subscriberMap.delete(callback);
    }
  }

  // --- Playback Controls ---
  public play() {
    if (this._isPlaying.peek()) return;
    this._isPlaying.value = true;

    // Sync driver immediately
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this.fps) * 1000, {
      isPlaying: true,
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek()
    });

    this.ticker.start(this.onTick);
  }

  public pause() {
    if (!this._isPlaying.peek()) return;
    this._isPlaying.value = false;
    this.ticker.stop();

    // Sync driver to ensure media is paused
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this.fps) * 1000, {
      isPlaying: false,
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek()
    });
  }

  public seek(frame: number) {
    const newFrame = Math.max(0, Math.min(frame, this.duration * this.fps));
    this._currentFrame.value = newFrame;

    this.driver.update((newFrame / this.fps) * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek()
    });
  }

  /**
   * Binds the Helios instance to document.timeline.
   * This is useful when the timeline is being driven externally (e.g. by the Renderer).
   * Helios will poll document.timeline.currentTime and update its internal state.
   */
  public bindToDocumentTimeline() {
    if (typeof document === 'undefined' || !document.timeline) {
        console.warn('document.timeline is not available.');
        return;
    }

    this.syncWithDocumentTimeline = true;

    // Start a loop to poll the timeline
    const poll = () => {
        if (!this.syncWithDocumentTimeline) return;

        const currentTime = document.timeline.currentTime;
        if (currentTime !== null && typeof currentTime === 'number') {
            const frame = (currentTime / 1000) * this.fps;
            if (frame !== this._currentFrame.peek()) {
                 this._currentFrame.value = frame;
            }
        }
        requestAnimationFrame(poll);
    };

    requestAnimationFrame(poll);
  }

  public unbindFromDocumentTimeline() {
      this.syncWithDocumentTimeline = false;
  }

  public dispose() {
    this.pause();
    this.ticker.stop();
    this.unbindFromDocumentTimeline();

    this.subscriberMap.forEach((dispose) => dispose());
    this.subscriberMap.clear();
  }

  private onTick = (deltaTime: number) => {
    if (!this._isPlaying.peek()) return;

    // If we are syncing FROM document.timeline, we shouldn't drive our own loop logic
    if (this.syncWithDocumentTimeline) {
        return;
    }

    const totalFrames = this.duration * this.fps;
    const playbackRate = this._playbackRate.peek();
    const frameDelta = (deltaTime / 1000) * this.fps * playbackRate;
    const nextFrame = this._currentFrame.peek() + frameDelta;

    if (playbackRate > 0) {
      if (nextFrame >= totalFrames) {
        this._currentFrame.value = totalFrames - 1;
        this.pause();
        return;
      }
    } else {
      if (nextFrame <= 0) {
        this._currentFrame.value = 0;
        this.pause();
        return;
      }
    }

    this._currentFrame.value = nextFrame;

    this.driver.update((nextFrame / this.fps) * 1000, {
      isPlaying: true,
      playbackRate,
      volume: this._volume.peek(),
      muted: this._muted.peek()
    });
  }
}
